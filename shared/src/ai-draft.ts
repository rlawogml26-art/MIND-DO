import { z } from "zod";
import { ticketDesignSchema } from "./ticket-design.js";

// AI 초안 (AGENTS.md "AI 초안", 노션 API 명세 "AI 초안 생성")
// 요청 스키마(사진 키 1~4장)는 사진 업로드 상수와 함께 AI 초안 API PR에서 추가한다.

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

export const aiDraftSchema = z.object({
  draftNo: z.number().int().min(1).max(AI_DRAFT_COUNT), // 1번이 추천안
  source: z.enum(AI_DRAFT_SOURCES),
  design: ticketDesignSchema,
});

export const aiDraftsResponseSchema = z.object({
  drafts: z.array(aiDraftSchema).length(AI_DRAFT_COUNT),
});

export type AiDraftSource = (typeof AI_DRAFT_SOURCES)[number];
export type AiDraft = z.infer<typeof aiDraftSchema>;
export type AiDraftsResponse = z.infer<typeof aiDraftsResponseSchema>;
