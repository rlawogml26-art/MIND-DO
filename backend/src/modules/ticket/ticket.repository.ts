import type { CreateTicketInput, UpdateTicketInput } from "@mind-do/shared";

export type Ticket = CreateTicketInput & {
  ticketId: number;
  userId: number;
  deletedAt: Date | null;
  expiresAt?: Date;
};

// DB 스키마가 준비되기 전까지만 이 저장소를 사용한다.
const tickets: Ticket[] = [
  {
    ticketId: 1,
    userId: 1,
    deletedAt: null,
    title: "뮤지컬 관람",
    visitDate: "2026-06-15",
    location: "COEX 신한카드 아트움",
    memo: "재밌겠다!",
  },
  {
    ticketId: 2,
    userId: 1,
    deletedAt: null,
    title: "전시회 관람",
    visitDate: "2026-06-20",
    location: "북촌 어둠속의대화",
    memo: "기대되는 전시",
  },
];
let nextTicketId = 3;

export const createTicket = async (
  input: CreateTicketInput,
  userId: number,
): Promise<Ticket> => {
  const ticket: Ticket = {
    ...input,
    ticketId: nextTicketId++,
    userId,
    deletedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  tickets.push(ticket);
  return ticket;
};

export const getTickets = async (): Promise<Ticket[]> =>
  tickets.filter((ticket) => ticket.deletedAt === null);

export const getTicketById = async (
  ticketId: number,
): Promise<Ticket | undefined> =>
  tickets.find(
    (ticket) => ticket.ticketId === ticketId && ticket.deletedAt === null,
  );

export const updateTicket = async (
  ticketId: number,
  input: UpdateTicketInput,
): Promise<Ticket | undefined> => {
  const index = tickets.findIndex((ticket) => ticket.ticketId === ticketId);
  const ticket = tickets[index];
  if (!ticket || ticket.deletedAt !== null) return undefined;
  const updatedTicket = { ...ticket, ...input };
  tickets[index] = updatedTicket;
  return updatedTicket;
};

export const deleteTicket = async (ticketId: number): Promise<boolean> => {
  const index = tickets.findIndex((ticket) => ticket.ticketId === ticketId);
  const ticket = tickets[index];
  if (!ticket || ticket.deletedAt !== null) return false;
  ticket.deletedAt = new Date();
  return true;
};
