import { z } from "zod";

// AI 초안의 분위기 태그 (임시값, AGENTS.md "임시값". v3 테스트 목록)
// AI가 사진·분위기 프롬프트에서 읽은 분위기를 이 목록으로 분류하고,
// 서버는 "첫 초안이 프롬프트 분위기를 따랐나", "정반대 분위기가 없나"를 이 태그로 검사한다.
// 섬세한 뉘앙스는 프롬프트 원문을 AI가 직접 읽어서 반영하고, 태그는 큰 분류만 맡는다.
// 목록은 여기 한 곳에서만 정의한다. 템플릿이 늘면 템플릿 기준으로 넓힌다.
export const MOOD_TAGS = [
  "따뜻함",
  "밤",
  "낮",
  "맑음",
  "흐림",
  "레트로",
  "귀여움",
  "여행",
  "생일",
  "차분함",
  "활기참",
  "자연",
  "음식",
  "공연",
  "데이트",
  "설렘",
  "축하",
  "모임",
  "감성",
] as const;

export const moodTagSchema = z.enum(MOOD_TAGS);

export type MoodTag = z.infer<typeof moodTagSchema>;
