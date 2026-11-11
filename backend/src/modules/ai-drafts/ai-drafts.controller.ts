import type { Request, Response } from "express";
import {
  aiDraftsParamsSchema,
  aiDraftsRequestSchema,
  aiDraftsResponseSchema,
  ErrorCode,
} from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  AiDraftAlreadyGeneratedError,
  authenticateAiDraftRequester,
  createAiDrafts,
  InvalidPhotoKeyError,
  NotInvitedError,
  SharedTicketNotFoundError,
  TicketAlreadyCompletedError,
  UnauthorizedError,
} from "./ai-drafts.service.js";

export async function postAiDrafts(req: Request, res: Response) {
  let userId: number;
  try {
    userId = authenticateAiDraftRequester(req.headers.cookie);
  } catch (error: unknown) {
    if (error instanceof AccessTokenExpiredError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.ACCESS_TOKEN_EXPIRED,
          message: "로그인 정보가 만료되었습니다.",
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

  const parsedParams = aiDraftsParamsSchema.safeParse(req.params);
  const parsedBody = aiDraftsRequestSchema.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const response = await createAiDrafts(
      userId,
      parsedParams.data.sharedTicketId,
      parsedBody.data,
    );
    return res
      .status(200)
      .json({ data: aiDraftsResponseSchema.parse(response) });
  } catch (error: unknown) {
    if (error instanceof InvalidPhotoKeyError) {
      return res.status(400).json({
        error: {
          code: ErrorCode.INVALID_PHOTO_KEY,
          message: "사진 키를 확인해주세요.",
        },
      });
    }
    if (error instanceof SharedTicketNotFoundError) {
      return res.status(404).json({
        error: {
          code: ErrorCode.SHARED_TICKET_NOT_FOUND,
          message: "공동 티켓을 찾을 수 없습니다.",
        },
      });
    }
    if (error instanceof NotInvitedError) {
      return res.status(403).json({
        error: {
          code: ErrorCode.NOT_INVITED,
          message: "공동 티켓 초대자만 초안을 생성할 수 있습니다.",
        },
      });
    }
    if (error instanceof TicketAlreadyCompletedError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.TICKET_ALREADY_COMPLETED,
          message: "이미 개인 티켓을 저장했습니다.",
        },
      });
    }
    if (error instanceof AiDraftAlreadyGeneratedError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.AI_DRAFT_ALREADY_GENERATED,
          message: "이 슬롯에서 이미 AI 초안을 생성했습니다.",
        },
      });
    }
    process.stderr.write(
      `${JSON.stringify({
        event: "AI drafts request failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
    throw error;
  }
}
