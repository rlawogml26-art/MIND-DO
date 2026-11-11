import { z } from "zod";

// 개인 티켓 디자인 (TicketDesign)
// AI 초안 응답, 개인 티켓 저장(발권) 요청, tickets.design 칸이 모두 이 형식을 쓴다.
// 서버는 AI가 만든 것이든 사용자가 고친 것이든 저장 전에 이 스키마로 다시 검증한다.
// 중간 발표 범위는 사진 합성 방식(composite)만이다. 프레임·스티커 방식(frame)은 카탈로그 v4에서 추가한다.

export const TICKET_DESIGN_VERSION = 1;

// 카탈로그 ID (중간 발표용 임시값, 카탈로그 v4에서 확정)
// 사진 합성 템플릿: 자연스러운 장면 / 감각적인 조합 / 광원·색감·질감
export const COMPOSITE_TEMPLATE_IDS = [
  "blend_fade",
  "collage_grid",
  "light_basic",
] as const;
// 팔레트: 따뜻한 노을 / 차분한 푸른빛 / 밤의 조명 / 파스텔 / 선명한 색 / 빈티지 흑백
// 팔레트는 색 하나가 아니라 "사진에서 뽑은 색을 어떻게 다듬을지"의 규칙이다.
// 실제 색(backgroundColor)은 서버가 사진의 주요 색과 팔레트 규칙으로 만든다.
export const PALETTE_IDS = [
  "warm",
  "cool",
  "night",
  "pastel",
  "vivid",
  "mono",
] as const;

// 스티커·텍스트 최대 개수. 꾸미기는 발표 이후라 지금은 0(빈 배열만 허용).
// 개수·크기 범위가 정해지면 이 값과 아래 배치 스키마를 함께 바꾼다.
export const TICKET_STICKERS_MAX = 0;
export const TICKET_TEXTS_MAX = 0;

export const compositeTemplateIdSchema = z.enum(COMPOSITE_TEMPLATE_IDS);
export const paletteIdSchema = z.enum(PALETTE_IDS);

// 위치는 티켓 기준 0~1 (왼쪽 위가 0, 오른쪽 아래가 1)
const positionSchema = z.number().min(0).max(1);

// 색 값 #RRGGBB. 서버가 만든 색이든 사용자가 꾸미기에서 고른 색이든 형식만 검사한다.
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const ticketStickerSchema = z.object({
  stickerId: z.string().min(1), // 카탈로그 ID
  x: positionSchema,
  y: positionSchema,
  scale: z.number().positive(),
  rotation: z.number(),
});

export const ticketTextSchema = z.object({
  content: z.string(),
  x: positionSchema,
  y: positionSchema,
  fontId: z.string().min(1), // 카탈로그 ID
  scale: z.number().positive(),
  rotation: z.number(),
  color: hexColorSchema,
});

export const compositeTicketDesignSchema = z.object({
  version: z.literal(TICKET_DESIGN_VERSION),
  method: z.literal("composite"),
  templateId: compositeTemplateIdSchema,
  paletteId: paletteIdSchema,
  backgroundColor: hexColorSchema, // 템플릿의 배경 색 (어디에 칠할지는 템플릿 그리는 방식을 따른다)
  stickers: z.array(ticketStickerSchema).max(TICKET_STICKERS_MAX),
  texts: z.array(ticketTextSchema).max(TICKET_TEXTS_MAX),
});

// method로 갈라 검사한다. frame 방식은 여기에 스키마를 하나 더 넣는다.
export const ticketDesignSchema = z.discriminatedUnion("method", [
  compositeTicketDesignSchema,
]);

export type CompositeTemplateId = z.infer<typeof compositeTemplateIdSchema>;
export type PaletteId = z.infer<typeof paletteIdSchema>;
export type TicketSticker = z.infer<typeof ticketStickerSchema>;
export type TicketText = z.infer<typeof ticketTextSchema>;
export type TicketDesign = z.infer<typeof ticketDesignSchema>;
