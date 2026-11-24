import assert from "node:assert/strict";
import test from "node:test";
import {
  DESIGNS,
  aiDraftsRequestSchema,
  ticketDesignSchema,
  type DesignCategory,
  type DesignFile,
} from "@mind-do/shared";
import {
  createFallbackDrafts,
  eligibleCategories,
  normalizeAiDraftSelection,
  rankDesigns,
  selectionToDrafts,
} from "./ai-drafts.selection.js";

// 레포의 실제 디자인을 카테고리·태그·대표 색만 바꿔 쓴다.
// 초안 응답은 디자인 id가 디자인 목록에 있는지 검증하므로 id는 실제 것이어야 한다
function fixture(
  index: number,
  category: DesignCategory,
  tags: DesignFile["tags"],
  mainColor: string,
): DesignFile {
  const base = DESIGNS[index];
  assert.ok(base, "테스트에 디자인이 4개 이상 필요");
  return { ...base, category, tags, mainColor };
}

const designs: DesignFile[] = [
  fixture(0, "film", ["밤", "차분함"], "#202840"),
  fixture(1, "film", ["낮", "활기참"], "#F0D060"),
  fixture(2, "film", ["감성"], "#808080"),
  fixture(3, "ticket", ["축하"], "#FF0000"),
];

test("only categories with three or more designs are eligible", () => {
  assert.deepEqual(eligibleCategories(designs), ["film"]);
});

test("rejects a category the AI was not offered", () => {
  assert.equal(
    normalizeAiDraftSelection({ category: "ticket", moodTags: [] }, ["film"]),
    undefined,
  );
  assert.equal(
    normalizeAiDraftSelection({ category: "film", moodTags: ["없는태그"] }, [
      "film",
    ]),
    undefined,
  );
  assert.deepEqual(
    normalizeAiDraftSelection({ category: "film", moodTags: ["밤"] }, ["film"]),
    { category: "film", moodTags: ["밤"] },
  );
});

test("ranks by matching tags and pushes clashing moods down", () => {
  const ranked = rankDesigns(
    designs.filter((design) => design.category === "film"),
    ["밤"],
    [],
  );
  assert.equal(ranked[0]?.tags.includes("밤"), true);
  // "낮" 디자인은 "밤"과 정반대라 맨 뒤
  assert.equal(ranked[2]?.tags.includes("낮"), true);
});

test("uses color closeness when tags tie", () => {
  const ranked = rankDesigns(
    designs.filter((design) => design.category === "film"),
    [],
    ["#F2D262"],
  );
  assert.equal(ranked[0]?.mainColor, "#F0D060");
});

test("returns three different designs from one category", () => {
  const response = selectionToDrafts(
    { category: "film", moodTags: ["밤"] },
    [],
    designs,
  );
  const ids = response.drafts.map((draft) => draft.design.designId);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(
    response.drafts.map((draft) => draft.source),
    ["ai", "ai", "ai"],
  );
  assert.deepEqual(
    response.drafts.map((draft) => draft.draftNo),
    [1, 2, 3],
  );
});

test("fallback picks an eligible category without AI", () => {
  const response = createFallbackDrafts(["#202840"], designs);
  assert.deepEqual(
    response.drafts.map((draft) => draft.source),
    ["fallback", "fallback", "fallback"],
  );
  assert.equal(response.drafts.length, 3);
});

test("throws when no category has three designs", () => {
  assert.throws(() => createFallbackDrafts([], designs.slice(1)));
});

test("saved designs must point to a design in the list", () => {
  const known = DESIGNS[0];
  assert.ok(known);
  assert.equal(
    ticketDesignSchema.safeParse({
      version: 2,
      method: "design",
      designId: known.id,
    }).success,
    true,
  );
  assert.equal(
    ticketDesignSchema.safeParse({
      version: 2,
      method: "design",
      designId: "film_nothing_99",
    }).success,
    false,
  );
  assert.equal(
    ticketDesignSchema.safeParse({
      version: 1,
      method: "composite",
      templateId: "blend_fade",
    }).success,
    false,
  );
});

test("validates photo key count and uniqueness and normalizes blank prompts", () => {
  const parsed = aiDraftsRequestSchema.safeParse({
    photoKeys: ["tickets/31/3/photo.jpg"],
    moodPrompt: "  ",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.moodPrompt, null);

  assert.equal(
    aiDraftsRequestSchema.safeParse({
      photoKeys: ["same.jpg", "same.jpg"],
    }).success,
    false,
  );
  assert.equal(
    aiDraftsRequestSchema.safeParse({ photoKeys: [] }).success,
    false,
  );
});
