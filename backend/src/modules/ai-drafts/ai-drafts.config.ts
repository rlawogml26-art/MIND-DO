import { z } from "zod";

// AI 초안 환경변수 (AGENTS.md "AI 초안")
// 코드에 기본값을 두지 않는다. 값이 없거나 잘못되면 이 파일을 읽는 순간(서버 시작 때) 에러를 낸다.
// 값은 Parameter Store /mindo/{환경}/ 에 있고, 로컬은 backend/.env에 넣는다.

const positiveInt = z.coerce.number().int().positive();

const aiDraftsEnvSchema = z.object({
  AWS_REGION: z.string().min(1),
  BEDROCK_MODEL_ID: z.string().min(1),
  AI_TIMEOUT_MS: positiveInt, // Bedrock 1회 호출 제한 시간
  AI_IMAGE_MAX_SIDE: positiveInt, // AI에 보내는 사진의 긴 변(px)
  AI_IMAGE_JPEG_QUALITY: z.coerce.number().int().min(1).max(100),
  AI_COLORS_PER_PHOTO: positiveInt, // 사진 한 장에서 뽑는 주요 색 개수
  AI_MAX_TOKENS: positiveInt, // AI 응답 최대 길이
  AI_TEMPERATURE: z.coerce.number().min(0).max(1), // 응답의 무작위성
});

export type AiDraftsConfig = {
  region: string;
  modelId: string;
  timeoutMs: number;
  imageMaxSide: number;
  imageJpegQuality: number;
  colorsPerPhoto: number;
  maxTokens: number;
  temperature: number;
};

export function readAiDraftsConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiDraftsConfig {
  const parsed = aiDraftsEnvSchema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`AI 초안 환경변수가 없거나 잘못됨: ${names.join(", ")}`);
  }
  const e = parsed.data;
  return {
    region: e.AWS_REGION,
    modelId: e.BEDROCK_MODEL_ID,
    timeoutMs: e.AI_TIMEOUT_MS,
    imageMaxSide: e.AI_IMAGE_MAX_SIDE,
    imageJpegQuality: e.AI_IMAGE_JPEG_QUALITY,
    colorsPerPhoto: e.AI_COLORS_PER_PHOTO,
    maxTokens: e.AI_MAX_TOKENS,
    temperature: e.AI_TEMPERATURE,
  };
}
