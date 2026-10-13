import { Request, Response } from 'express';

// 티켓 생성 컨트롤러
export const createTicket = async (req: Request, res: Response) => {
  try {
    const ticketData = req.body;

    // TODO: 나중에 DB 연동 및 유효성 검사 추가

    // 팀 표준 응답 규격(data)에 맞추어 반환
    return res.status(201).json({
      data: {
        message: "티켓이 성공적으로 생성되었습니다.",
        ticket: ticketData,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "티켓 생성 중 오류가 발생했습니다.",
      },
    });
  }
};