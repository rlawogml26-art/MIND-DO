import { Request, Response } from "express";
import { z } from "zod";

// Zod 유효성 검증 스키마 정의
export const ticketSchema = z.object({
  title: z
    .string()
    .max(30, "제목은 최대 30자까지 입력 가능합니다.")
    .optional()
    .nullable(),
  imageUrl: z.string().optional().nullable(),
  location: z
    .string()
    .min(1, "방문 장소는 필수입니다.")
    .max(30, "방문 장소는 최대 30자까지 입력 가능합니다."),
  visitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD여야 합니다."),
  memo: z
    .string()
    .max(200, "메모는 최대 200자까지 입력 가능합니다.")
    .optional()
    .nullable(),
});

const dummyTickets = [
  {
    ticketId: 1,
    title: "뮤지컬 관람",
    visitDate: "2026-06-15",
    location: "COEX 신한카드 아트움",
    memo: "재밌겠다!",
  },
  {
    ticketId: 2,
    title: "전시회 관람",
    visitDate: "2026-06-20",
    location: "북촌 어둠속의대화",
    memo: "기대되는 전시",
  },
];

// 티켓 생성 컨트롤러 (Zod 검증 적용)
export const createTicket = async (req: Request, res: Response) => {
  try {
    // 1. Zod로 요청 데이터 검증
    const result = ticketSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: result.error.issues[0].message,
        },
      });
    }

    const { title, imageUrl, location, visitDate, memo } = result.data;
    
    const newTicket = {
      ticketId: dummyTickets.length + 1,
      title: title || "", // null 대신 빈 문자열 또는 undefined 처리
      imageUrl: imageUrl || "",
      location,
      visitDate,
      memo: memo || "",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    dummyTickets.push(newTicket);

    return res.status(201).json({
      data: {
        ticketId: newTicket.ticketId,
        message: "티켓이 성공적으로 생성되었습니다. (24시간 동안 보관됩니다.)",
        ticket: newTicket,
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 생성 중 오류가 발생했습니다.",
      },
    });
  }
};

// 저장한 티켓 목록 조회 컨트롤러
export const getTickets = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      data: {
        tickets: dummyTickets,
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 목록 조회 중 오류가 발생했습니다.",
      },
    });
  }
};

// 티켓 상세 조회 컨트롤러
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = dummyTickets.find((t) => t.ticketId === Number(ticketId));

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "해당 티켓을 찾을 수 없습니다.",
        },
      });
    }

    return res.status(200).json({
      data: {
        ticket,
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 상세 조회 중 오류가 발생했습니다.",
      },
    });
  }
};

// 티켓 수정 컨트롤러
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { title, visitDate, location, memo } = req.body;

    const ticketIndex = dummyTickets.findIndex(
      (t) => t.ticketId === Number(ticketId),
    );

    if (ticketIndex === -1) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "수정할 티켓을 찾을 수 없습니다.",
        },
      });
    }

    const updatedTicket = {
      ...dummyTickets[ticketIndex],
      ...(title !== undefined && { title }),
      ...(visitDate !== undefined && { visitDate }),
      ...(location !== undefined && { location }),
      ...(memo !== undefined && { memo }),
    };

    dummyTickets[ticketIndex] = updatedTicket;

    return res.status(200).json({
      data: {
        message: "티켓이 성공적으로 수정되었습니다.",
        ticket: updatedTicket,
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 수정 중 오류가 발생했습니다.",
      },
    });
  }
};

// 티켓 삭제 컨트롤러
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticketIndex = dummyTickets.findIndex(
      (t) => t.ticketId === Number(ticketId),
    );

    if (ticketIndex === -1) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "삭제할 티켓을 찾을 수 없습니다.",
        },
      });
    }

    dummyTickets.splice(ticketIndex, 1);

    return res.status(200).json({
      data: {
        message: "티켓이 성공적으로 삭제되었습니다.",
      },
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 삭제 중 오류가 발생했습니다.",
      },
    });
  }
};
