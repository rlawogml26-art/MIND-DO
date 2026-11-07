import { z } from "zod";

// 티켓 생성 입력 규칙은 프론트엔드 폼 검증에서 사용한다.
export const TICKET_TITLE_MAX = 15;
export const TICKET_LOCATION_MAX = 15;
export const TICKET_MEMO_MAX = 80;

export const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(TICKET_TITLE_MAX),
  location: z.string().trim().min(1).max(TICKET_LOCATION_MAX),
  visitDate: z.iso.date(), // YYYY-MM-DD, 없는 날짜(2월 30일 등)도 거절
  memo: z.string().max(TICKET_MEMO_MAX).optional(),
});
