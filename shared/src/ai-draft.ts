import { z } from "zod";
import {
  PHOTO_UPLOAD_MAX_COUNT,
  PHOTO_UPLOAD_MIN_COUNT,
} from "./photo-upload.js";
import { ticketDesignSchema } from "./ticket-design.js";

// AI 초안 (AGENTS.md "AI 초안", 노션 API 명세 "AI 초안 생성")
// 분위기 프롬프트 최대 글자 수 (임시값, AGENTS.md "임시값". AI 테스트 후 확정)
// 개인 티켓 뒷면 메모(500자)와 다른 값이다.
export const MOOD_PROMPT_MAX = 50;

// 한 번에 돌려주는 초안 수. AI가 실패해도 기본 템플릿으로 항상 이 개수를 채운다.
export const AI_DRAFT_COUNT = 3;

// 초안을 누가 골랐나: ai = AI가 고름, fallback = AI 실패로 기본 템플릿
export const AI_DRAFT_SOURCES = ["ai", "fallback"] as const;

// 분위기 프롬프트 (선택). 앞뒤 공백을 지우고, 비었으면 null로 본다.
export const moodPromptSchema = z
  .string()
  .trim()
  .max(MOOD_PROMPT_MAX)
  .nullish()
  .transform((value) => (value ? value : null));

export const aiDraftsParamsSchema = z.object({
  sharedTicketId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
});

export const aiDraftsRequestSchema = z.object({
  photoKeys: z
    .array(z.string().min(1).max(255))
    .min(PHOTO_UPLOAD_MIN_COUNT)
    .max(PHOTO_UPLOAD_MAX_COUNT)
    .refine((photoKeys) => new Set(photoKeys).size === photoKeys.length),
  moodPrompt: moodPromptSchema.optional(),
});

export const aiDraftSchema = z.object({
  draftNo: z.number().int().min(1).max(AI_DRAFT_COUNT), // 1번이 추천안
  source: z.enum(AI_DRAFT_SOURCES),
  design: ticketDesignSchema,
});

export const aiDraftsResponseSchema = z.object({
  drafts: z.array(aiDraftSchema).length(AI_DRAFT_COUNT),
});

export type AiDraftSource = (typeof AI_DRAFT_SOURCES)[number];
export type AiDraftsRequest = z.infer<typeof aiDraftsRequestSchema>;
export type AiDraft = z.infer<typeof aiDraftSchema>;
export type AiDraftsResponse = z.infer<typeof aiDraftsResponseSchema>;
