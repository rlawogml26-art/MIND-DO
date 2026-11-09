import type { Request, Response } from "express";
import {
  ErrorCode,
  sharedTicketPhotoUploadParamsSchema,
  sharedTicketPhotoUploadRequestSchema,
  sharedTicketPhotoUploadUrlsResponseSchema,
} from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";
import {
  createSharedTicketPhotoUploadUrls,
  NotInvitedError,
  SharedTicketNotFoundError,
  TicketAlreadyCompletedError,
} from "./shared-tickets.service.js";

export const postSharedTicketPhotoUploadUrls = async (
  req: Request,
  res: Response,
) => {
  const parsedParams = sharedTicketPhotoUploadParamsSchema.safeParse(
    req.params,
  );
  const parsedBody = sharedTicketPhotoUploadRequestSchema.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const response = await createSharedTicketPhotoUploadUrls(
      req.headers.cookie,
      parsedParams.data.sharedTicketId,
      parsedBody.data,
    );
    return res.status(200).json({
      data: sharedTicketPhotoUploadUrlsResponseSchema.parse(response),
    });
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
          message: "공동 티켓 초대자만 사진을 업로드할 수 있습니다.",
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
    throw error;
  }
};
