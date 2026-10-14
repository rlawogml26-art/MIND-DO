import { Request, Response } from 'express';

// 가상의 티켓 저장소 (나중에 DB나 배열로 대체될 수 있어요)
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
    const ticketData = req.body;

    return res.status(201).json({
      data: {
        ticketId: 1,
        message: "티켓이 성공적으로 생성되었습니다.",
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 생성 중 오류가 없습니다.",
      },
    });
  }
};

// 저장한 티켓 목록 조회 컨트롤러
export const getTickets = async (req: Request, res: Response) => {
  try {
    // TODO: 나중에는 토큰에서 userId를 추출하여 해당 유저의 티켓만 필터링하고, visitDate 기준 최신순 정렬을 적용합니다.

    return res.status(200).json({
      data: {
        tickets: dummyTickets,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 목록 조회 중 오류가 발생했습니다.",
      },
    });
  }
};