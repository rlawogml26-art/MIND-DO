import { Request, Response } from 'express';

const dummyTickets = [
  {
    ticketId: 1,
    title: "뮤지컬 관람",
    visitDate: "2026-06-15",
    location: "COEX 신한카드 아트움",
    memo: "재밌겠다!"
  },
  {
    ticketId: 2,
    title: "전시회 관람",
    visitDate: "2026-06-20",
    location: "북촌 어둠속의대화",
    memo: "기대되는 전시"
  }
];

// 티켓 생성 컨트롤러
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { title, visitDate, location, memo } = req.body;

    return res.status(201).json({
      data: {
        ticketId: 1,
        message: "티켓이 성공적으로 생성되었습니다.",
        ticket: { title, visitDate, location, memo },
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