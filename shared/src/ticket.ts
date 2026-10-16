import { z } from "zod";

// 티켓 입력 규칙 (AGENTS.md "티켓 입력 규칙", 10/14 회의 결정)
export const TICKET_TITLE_MAX = 20;
export const TICKET_LOCATION_MAX = 20;
export const TICKET_MEMO_MAX = 80;

// 티켓 저장 요청
export const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(TICKET_TITLE_MAX),
  location: z.string().trim().min(1).max(TICKET_LOCATION_MAX),
  visitDate: z.iso.date(), // YYYY-MM-DD, 없는 날짜(2월 30일 등)도 거절
  memo: z.string().max(TICKET_MEMO_MAX).optional(),
});

// 티켓 수정 요청: 보낸 필드만 바꾼다
export const updateTicketSchema = createTicketSchema.partial();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
