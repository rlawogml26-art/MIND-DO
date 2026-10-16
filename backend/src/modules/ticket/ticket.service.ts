import type { CreateTicketInput, UpdateTicketInput } from "@mind-do/shared";
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
export const deleteTicket = (ticketId: number) =>
  repository.deleteTicket(ticketId);
