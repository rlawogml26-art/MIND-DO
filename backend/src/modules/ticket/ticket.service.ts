import type { CreateTicketInput, UpdateTicketInput } from "@mind-do/shared";
import * as repository from "./ticket.repository.js";
import { getRequesterId } from "./requester.js";

export const createTicket = (input: CreateTicketInput) =>
  repository.createTicket(input, getRequesterId());
export const getTickets = () => repository.getTickets();
export const getTicketById = (ticketId: number) =>
  repository.getTicketById(ticketId);
export const updateTicket = (ticketId: number, input: UpdateTicketInput) =>
  repository.updateTicket(ticketId, input);
export const deleteTicket = (ticketId: number) =>
  repository.deleteTicket(ticketId);
