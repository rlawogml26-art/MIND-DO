import type { CreateTicketInput, UpdateTicketInput } from "@mind-do/shared";
import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
} from "../auth/auth.service.js";
import { canViewPersonalTicketInSharedTicket } from "../shared-tickets/shared-tickets.service.js";
import * as repository from "./ticket.repository.js";
import { getRequesterId } from "./requester.js";

// 열람 권한과 주인 확인은 후속 Issue #15에서 구현한다.
export const createTicket = (input: CreateTicketInput) =>
  repository.createTicket(input, getRequesterId());
export const getTickets = () => repository.getTickets();
export const getTicketById = (ticketId: number) =>
  repository.getTicketById(ticketId);
export const updateTicket = (ticketId: number, input: UpdateTicketInput) =>
  repository.updateTicket(ticketId, input);
export const deleteTicket = async (
  cookieHeader: string | undefined,
  ticketId: number,
) => {
  const requesterId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const ticket = await repository.findActivePersonalTicket(ticketId);
  if (!ticket) return "not_found";

  if (ticket.userId !== requesterId) {
    const canView =
      ticket.sharedTicketId !== null &&
      (await canViewPersonalTicketInSharedTicket(
        ticket.sharedTicketId,
        ticketId,
        requesterId,
      ));
    return canView ? "not_owner" : "not_found";
  }

  const count = await repository.softDeleteOwnedPersonalTicket(
    ticketId,
    requesterId,
  );
  return count === 1 ? "deleted" : "not_found";
};
