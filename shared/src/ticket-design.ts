import { z } from "zod";
import { findDesign } from "./designs/registry.js";

// 개인 티켓 디자인 (TicketDesign)
// AI 초안 응답, 개인 티켓 저장(발권) 요청, tickets.design 칸이 모두 이 형식을 쓴다.
// 디자인은 레포의 디자인 목록(shared/src/designs) 중 하나를 id로 가리킨다 (AGENTS.md "티켓 디자인").
// 서버는 AI가 고른 것이든 앱이 보낸 것이든 저장 전에 이 스키마로 다시 검증한다.
//
// 중간 발표 때의 템플릿·팔레트 형식(version 1, method "composite")은 11/24에 없앴다.
// 그 형식으로 저장된 예전 티켓은 조회 때 design이 null로 내려간다 (shared-ticket.ts).
export const TICKET_DESIGN_VERSION = 2;

export const ticketDesignSchema = z.object({
  version: z.literal(TICKET_DESIGN_VERSION),
  method: z.literal("design"),
  designId: z
    .string()
    .min(1)
    .refine((designId) => findDesign(designId) !== undefined),
});

export type TicketDesign = z.infer<typeof ticketDesignSchema>;
