import type { Request, Response } from "express";
import { z } from "zod";
import {
  createTicketSchema,
  deleteTicketResponseSchema,
  updateTicketSchema,
  ticketResponseSchema,
  ErrorCode,
} from "@mind-do/shared";
import * as service from "./ticket.service.js";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";

const ticketIdSchema = z.object({
  ticketId: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
});

const invalidInput = (res: Response) =>
  res.status(400).json({
    error: { code: ErrorCode.INVALID_INPUT, message: "입력값을 확인해주세요." },
  });

const notFound = (res: Response) =>
  res.status(404).json({
    error: {
      code: ErrorCode.TICKET_NOT_FOUND,
      message: "해당 티켓을 찾을 수 없습니다.",
    },
  });

const serverError = (res: Response) =>
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: "티켓 처리 중 오류가 발생했습니다.",
    },
  });

export const createTicket = async (req: Request, res: Response) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) return invalidInput(res);
  try {
    const ticket = await service.createTicket(parsed.data);
    return res.status(201).json({
      data: {
        ticketId: ticket.ticketId,
        message: "티켓이 성공적으로 생성되었습니다.",
        ticket: ticketResponseSchema.parse(ticket),
      },
    });
  } catch {
    return serverError(res);
  }
};

export const getTickets = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      data: {
        tickets: (await service.getTickets()).map((ticket) =>
          ticketResponseSchema.parse(ticket),
        ),
      },
    });
  } catch {
    return serverError(res);
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  const params = ticketIdSchema.safeParse(req.params);
  if (!params.success) return invalidInput(res);
  try {
    const ticket = await service.getTicketById(params.data.ticketId);
    if (!ticket) return notFound(res);
    return res
      .status(200)
      .json({ data: { ticket: ticketResponseSchema.parse(ticket) } });
  } catch {
    return serverError(res);
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  const params = ticketIdSchema.safeParse(req.params);
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!params.success || !parsed.success) return invalidInput(res);
  try {
    const ticket = await service.updateTicket(
      params.data.ticketId,
      parsed.data,
    );
    if (!ticket) return notFound(res);
    return res.status(200).json({
      data: {
        message: "티켓이 성공적으로 수정되었습니다.",
        ticket: ticketResponseSchema.parse(ticket),
      },
    });
  } catch {
    return serverError(res);
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  const params = ticketIdSchema.safeParse(req.params);
  if (!params.success) return invalidInput(res);
  try {
    const { ticketId } = params.data;
    const result = await service.deleteTicket(req.headers.cookie, ticketId);
    if (result === "not_found") return notFound(res);
    if (result === "not_owner") {
      return res.status(403).json({
        error: {
          code: ErrorCode.NOT_TICKET_OWNER,
          message: "티켓 소유자만 삭제할 수 있습니다.",
        },
      });
    }
    return res.status(200).json({
      data: deleteTicketResponseSchema.parse({ ticketId }),
    });
  } catch (error: unknown) {
    if (error instanceof AccessTokenExpiredError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.ACCESS_TOKEN_EXPIRED,
          message: "액세스 토큰이 만료되었습니다.",
        },
      });
    }
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: "로그인이 필요합니다.",
        },
      });
    }
    throw error;
  }
};
