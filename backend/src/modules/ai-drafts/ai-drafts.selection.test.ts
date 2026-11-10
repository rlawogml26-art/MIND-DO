import assert from "node:assert/strict";
import test from "node:test";
import { aiDraftsRequestSchema } from "@mind-do/shared";
import {
  createFallbackDrafts,
  normalizeAiDraftSelection,
  selectionToDrafts,
} from "./ai-drafts.selection.js";

test("puts the recommended template first and repairs duplicate templates", () => {
  const selection = normalizeAiDraftSelection({
    choices: [
      { templateId: "blend", paletteId: "warm" },
      { templateId: "blend", paletteId: "cool" },
      { templateId: "light", paletteId: "night" },
    ],
    recommendedTemplateId: "light",
    moodTags: [],
  });

  assert.deepEqual(
    selection?.choices.map((choice) => choice.templateId),
    ["light", "blend", "collage"],
  );
});

test("changes a palette that contradicts the selected mood tags", () => {
  const selection = normalizeAiDraftSelection({
    choices: [
      { templateId: "blend", paletteId: "night" },
      { templateId: "collage", paletteId: "pastel" },
      { templateId: "light", paletteId: "cool" },
    ],
    recommendedTemplateId: "blend",
    moodTags: ["낮"],
  });

  assert.ok(selection);
  assert.notEqual(selection.choices[0]?.paletteId, "night");
});

test("rejects unknown catalog IDs and returns TicketDesign-compatible drafts", () => {
  const invalid = normalizeAiDraftSelection({
    choices: [
      { templateId: "unknown", paletteId: "warm" },
      { templateId: "collage", paletteId: "cool" },
      { templateId: "light", paletteId: "night" },
    ],
    recommendedTemplateId: "blend",
    moodTags: [],
  });
  assert.equal(invalid, undefined);

  const selection = normalizeAiDraftSelection({
    choices: [
      { templateId: "blend", paletteId: "warm" },
      { templateId: "collage", paletteId: "cool" },
      { templateId: "light", paletteId: "night" },
    ],
    recommendedTemplateId: "blend",
    moodTags: [],
  });
  assert.ok(selection);
  const response = selectionToDrafts(selection, []);
  assert.equal(response.drafts.length, 3);
  assert.equal(response.drafts[0]?.design.method, "composite");
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

test("fallback always returns three fixed catalog designs", () => {
  const fallback = createFallbackDrafts([]);

  assert.deepEqual(
    fallback.drafts.map((draft) => draft.source),
    ["fallback", "fallback", "fallback"],
  );
  assert.deepEqual(
    fallback.drafts.map((draft) => draft.design.templateId),
    ["blend", "collage", "light"],
  );
});
