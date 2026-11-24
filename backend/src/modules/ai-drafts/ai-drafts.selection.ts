import {
  AI_DRAFT_COUNT,
  AI_DRAFT_SOURCES,
  DESIGN_CATEGORIES,
  DESIGNS,
  MOOD_TAGS,
  TICKET_DESIGN_VERSION,
  aiDraftsResponseSchema,
  moodTagSchema,
  type AiDraftSource,
  type AiDraftsResponse,
  type DesignCategory,
  type DesignFile,
  type MoodTag,
} from "@mind-do/shared";
import { z } from "zod";
import {
  COLOR_SCORE_WEIGHT,
  MOOD_CLASHES,
  MOOD_CLASH_PENALTY,
  TAG_MATCH_SCORE,
} from "./ai-drafts.catalog.js";
import { colorCloseness } from "./ai-drafts.color.js";

// AI는 분위기 태그와 카테고리만 정하고, 그 카테고리 안에서 디자인 3개는 코드가 고른다 (11/24 결정).
// AI가 목록에 없는 디자인 id를 지어낼 수 없고, 디자인이 늘어도 프롬프트가 길어지지 않는다.

export class NoEligibleCategoryError extends Error {}

// 초안 3개는 같은 카테고리 안의 서로 다른 디자인이라(AGENTS.md "AI 초안"), 디자인이 3개 이상인 카테고리만 후보다
export function eligibleCategories(
  designs: readonly DesignFile[] = DESIGNS,
): DesignCategory[] {
  return DESIGN_CATEGORIES.filter(
    (category) =>
      designs.filter((design) => design.category === category).length >=
      AI_DRAFT_COUNT,
  );
}

const selectionSchema = z.object({
  category: z.enum(DESIGN_CATEGORIES),
  moodTags: z
    .array(moodTagSchema)
    .max(MOOD_TAGS.length)
    .refine((moodTags) => new Set(moodTags).size === moodTags.length),
});

export type AiDraftSelection = z.infer<typeof selectionSchema>;

export function normalizeAiDraftSelection(
  value: unknown,
  categories: readonly DesignCategory[],
): AiDraftSelection | undefined {
  const parsed = selectionSchema.safeParse(value);
  if (!parsed.success) return undefined;
  if (!categories.includes(parsed.data.category)) return undefined;
  return parsed.data;
}

export function selectionToDrafts(
  selection: AiDraftSelection,
  photoColors: readonly string[],
  designs: readonly DesignFile[] = DESIGNS,
): AiDraftsResponse {
  const ranked = rankDesigns(
    designs.filter((design) => design.category === selection.category),
    selection.moodTags,
    photoColors,
  );
  return toResponse(ranked, AI_DRAFT_SOURCES[0]);
}

// AI가 실패하면 색만으로 고른다: 카테고리마다 상위 3개의 색 점수 합이 가장 높은 카테고리
export function createFallbackDrafts(
  photoColors: readonly string[],
  designs: readonly DesignFile[] = DESIGNS,
): AiDraftsResponse {
  let best: { ranked: DesignFile[]; score: number } | undefined;
  for (const category of eligibleCategories(designs)) {
    const ranked = rankDesigns(
      designs.filter((design) => design.category === category),
      [],
      photoColors,
    ).slice(0, AI_DRAFT_COUNT);
    const score = ranked.reduce(
      (sum, design) => sum + colorCloseness(design.mainColor, photoColors),
      0,
    );
    if (!best || score > best.score) best = { ranked, score };
  }
  return toResponse(best?.ranked ?? [], AI_DRAFT_SOURCES[1]);
}

export function rankDesigns(
  designs: readonly DesignFile[],
  moodTags: readonly MoodTag[],
  photoColors: readonly string[],
): DesignFile[] {
  const scored = designs.map((design) => ({
    design,
    score: scoreDesign(design, moodTags, photoColors),
  }));
  // 점수가 같으면 id 순서로 정해 같은 입력에는 늘 같은 결과가 나오게 한다
  scored.sort(
    (x, y) => y.score - x.score || x.design.id.localeCompare(y.design.id),
  );
  return scored.map(({ design }) => design);
}

function scoreDesign(
  design: DesignFile,
  moodTags: readonly MoodTag[],
  photoColors: readonly string[],
): number {
  const tagScore =
    design.tags.filter((tag) => moodTags.includes(tag)).length *
    TAG_MATCH_SCORE;
  const clashes = MOOD_CLASHES.filter(
    ([first, second]) =>
      (moodTags.includes(first) && design.tags.includes(second)) ||
      (moodTags.includes(second) && design.tags.includes(first)),
  ).length;
  return (
    tagScore +
    colorCloseness(design.mainColor, photoColors) * COLOR_SCORE_WEIGHT -
    clashes * MOOD_CLASH_PENALTY
  );
}

function toResponse(
  ranked: readonly DesignFile[],
  source: AiDraftSource,
): AiDraftsResponse {
  const picked = ranked.slice(0, AI_DRAFT_COUNT);
  // 카테고리마다 디자인이 3개 이상 들어오기 전(디자인 PR 머지 전)에만 생긴다
  if (picked.length < AI_DRAFT_COUNT) throw new NoEligibleCategoryError();
  return aiDraftsResponseSchema.parse({
    drafts: picked.map((design, index) => ({
      draftNo: index + 1,
      source,
      design: {
        version: TICKET_DESIGN_VERSION,
        method: "design",
        designId: design.id,
      },
    })),
  });
}
