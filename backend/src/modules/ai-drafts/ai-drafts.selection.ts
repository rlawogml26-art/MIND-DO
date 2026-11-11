import {
  AI_DRAFT_COUNT,
  AI_DRAFT_SOURCES,
  COMPOSITE_TEMPLATE_IDS,
  MOOD_TAGS,
  PALETTE_IDS,
  TICKET_DESIGN_VERSION,
  aiDraftsResponseSchema,
  moodTagSchema,
  type AiDraft,
  type AiDraftsResponse,
  type CompositeTemplateId,
  type MoodTag,
  type PaletteId,
} from "@mind-do/shared";
import { z } from "zod";
import { MOOD_CLASHES, PALETTE_RULES } from "./ai-drafts.catalog.js";
import { makeBackgroundColor } from "./ai-drafts.color.js";

const selectionSchema = z.object({
  choices: z
    .array(
      z.object({
        templateId: z.enum(COMPOSITE_TEMPLATE_IDS),
        paletteId: z.enum(PALETTE_IDS),
      }),
    )
    .length(AI_DRAFT_COUNT),
  recommendedTemplateId: z.enum(COMPOSITE_TEMPLATE_IDS),
  moodTags: z
    .array(moodTagSchema)
    .max(MOOD_TAGS.length)
    .refine((moodTags) => new Set(moodTags).size === moodTags.length),
});

export type AiDraftSelection = z.infer<typeof selectionSchema>;

export function normalizeAiDraftSelection(
  value: unknown,
): AiDraftSelection | undefined {
  const parsed = selectionSchema.safeParse(value);
  if (!parsed.success) return undefined;
  if (
    !parsed.data.choices.some(
      (choice) => choice.templateId === parsed.data.recommendedTemplateId,
    )
  ) {
    return undefined;
  }

  const choices = parsed.data.choices.map((choice) => ({ ...choice }));
  const usedTemplates = new Set<CompositeTemplateId>();
  const missingTemplates = COMPOSITE_TEMPLATE_IDS.filter((templateId) => {
    if (choices.some((choice) => choice.templateId === templateId)) {
      return false;
    }
    return true;
  });

  for (const choice of choices) {
    if (usedTemplates.has(choice.templateId)) {
      const replacement = missingTemplates.shift();
      if (!replacement) return undefined;
      choice.templateId = replacement;
    }
    usedTemplates.add(choice.templateId);
  }

  if (
    !choices.some(
      (choice) => choice.templateId === parsed.data.recommendedTemplateId,
    )
  ) {
    return undefined;
  }

  const recommendedIndex = choices.findIndex(
    (choice) => choice.templateId === parsed.data.recommendedTemplateId,
  );
  const [recommended] = choices.splice(recommendedIndex, 1);
  if (!recommended) return undefined;
  choices.unshift(recommended);

  return {
    choices: choices.map((choice) => ({
      ...choice,
      paletteId: resolvePaletteClash(choice.paletteId, parsed.data.moodTags),
    })),
    recommendedTemplateId: parsed.data.recommendedTemplateId,
    moodTags: parsed.data.moodTags,
  };
}

export function selectionToDrafts(
  selection: AiDraftSelection,
  accentColors: readonly string[],
): AiDraftsResponse {
  const drafts: AiDraft[] = selection.choices.map((choice, index) => ({
    draftNo: index + 1,
    source: AI_DRAFT_SOURCES[0],
    design: {
      version: TICKET_DESIGN_VERSION,
      method: "composite",
      templateId: choice.templateId,
      paletteId: choice.paletteId,
      backgroundColor: makeBackgroundColor(choice.paletteId, accentColors),
      stickers: [],
      texts: [],
    },
  }));
  return aiDraftsResponseSchema.parse({ drafts });
}

export function createFallbackDrafts(
  accentColors: readonly string[],
): AiDraftsResponse {
  const choices: Array<{
    templateId: CompositeTemplateId;
    paletteId: PaletteId;
  }> = [
    { templateId: "blend_fade", paletteId: "warm" },
    { templateId: "collage_grid", paletteId: "pastel" },
    { templateId: "light_basic", paletteId: "night" },
  ];
  return aiDraftsResponseSchema.parse({
    drafts: choices.map((choice, index) => ({
      draftNo: index + 1,
      source: AI_DRAFT_SOURCES[1],
      design: {
        version: TICKET_DESIGN_VERSION,
        method: "composite",
        templateId: choice.templateId,
        paletteId: choice.paletteId,
        backgroundColor: makeBackgroundColor(choice.paletteId, accentColors),
        stickers: [],
        texts: [],
      },
    })),
  });
}

function resolvePaletteClash(
  paletteId: PaletteId,
  moodTags: readonly MoodTag[],
): PaletteId {
  if (!hasMoodClash(paletteId, moodTags)) return paletteId;
  return (
    PALETTE_IDS.find((candidate) => !hasMoodClash(candidate, moodTags)) ??
    paletteId
  );
}

function hasMoodClash(
  paletteId: PaletteId,
  moodTags: readonly MoodTag[],
): boolean {
  const paletteTags = PALETTE_RULES[paletteId].tags;
  return MOOD_CLASHES.some(
    ([first, second]) =>
      (moodTags.includes(first) && paletteTags.includes(second)) ||
      (moodTags.includes(second) && paletteTags.includes(first)),
  );
}
