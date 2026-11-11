import type { Request, Response } from "express";
import {
  createSharedTicketRequestSchema,
  ErrorCode,
  groupIdParamsSchema,
  issuedTicketResponseSchema,
  issueTicketRequestSchema,
  sharedTicketDetailResponseSchema,
  sharedTicketIdParamsSchema,
  sharedTicketListQuerySchema,
  sharedTicketListResponseSchema,
  sharedTicketPhotoUploadParamsSchema,
  sharedTicketPhotoUploadRequestSchema,
  sharedTicketPhotoUploadUrlsResponseSchema,
} from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";
import {
  createSharedTicket,
  createSharedTicketPhotoUploadUrls,
  getGroupSharedTicketList,
  getSharedTicketDetail,
  GroupNotFoundError,
  InvalidDesignError,
  InvalidInviteeError,
  InvalidPhotoKeyError,
  InvalidTicketDateError,
  issueTicket,
  NotInvitedError,
  SharedTicketDateTakenError,
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

const sendError = (
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
) => res.status(status).json({ error: { code, message } });

const sendInvalidInput = (res: Response) =>
  sendError(res, 400, ErrorCode.INVALID_INPUT, "입력값을 확인해주세요.");

// 세 API가 같은 뜻의 에러를 같은 응답으로 바꾼다. 처리하지 않은 에러는 false를 돌려 공통 500 처리로 넘긴다.
const sendKnownError = (res: Response, error: unknown): boolean => {
  if (error instanceof AccessTokenExpiredError) {
    sendError(
      res,
      401,
      ErrorCode.ACCESS_TOKEN_EXPIRED,
      "로그인 정보가 만료되었습니다.",
    );
  } else if (error instanceof UnauthorizedError) {
    sendError(res, 401, ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.");
  } else if (error instanceof GroupNotFoundError) {
    sendError(res, 404, ErrorCode.GROUP_NOT_FOUND, "그룹을 찾을 수 없습니다.");
  } else if (error instanceof SharedTicketNotFoundError) {
    sendError(
      res,
      404,
      ErrorCode.SHARED_TICKET_NOT_FOUND,
      "공동 티켓을 찾을 수 없습니다.",
    );
  } else if (error instanceof InvalidTicketDateError) {
    sendError(
      res,
      400,
      ErrorCode.INVALID_TICKET_DATE,
      "오늘 이후 날짜로는 만들 수 없습니다.",
    );
  } else if (error instanceof InvalidInviteeError) {
    sendError(
      res,
      400,
      ErrorCode.INVALID_INVITEE,
      "그룹 멤버만 초대할 수 있습니다.",
    );
  } else if (error instanceof SharedTicketDateTakenError) {
    sendError(
      res,
      409,
      ErrorCode.SHARED_TICKET_DATE_TAKEN,
      "이 날짜의 공동 티켓이 이미 있습니다.",
    );
  } else if (error instanceof NotInvitedError) {
    sendError(
      res,
      403,
      ErrorCode.NOT_INVITED,
      "공동 티켓 초대자만 개인 티켓을 만들 수 있습니다.",
    );
  } else if (error instanceof InvalidPhotoKeyError) {
    sendError(res, 400, ErrorCode.INVALID_PHOTO_KEY, "사진을 확인해주세요.");
  } else if (error instanceof InvalidDesignError) {
    sendError(res, 400, ErrorCode.INVALID_DESIGN, "디자인을 확인해주세요.");
  } else if (error instanceof TicketAlreadyCompletedError) {
    sendError(
      res,
      409,
      ErrorCode.TICKET_ALREADY_COMPLETED,
      "이미 개인 티켓을 저장했습니다.",
    );
  } else {
    return false;
  }
  return true;
};

export const postSharedTicket = async (req: Request, res: Response) => {
  const parsedParams = groupIdParamsSchema.safeParse(req.params);
  const parsedBody = createSharedTicketRequestSchema.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return sendInvalidInput(res);
  }

  try {
    const detail = await createSharedTicket(
      req.headers.cookie,
      parsedParams.data.groupId,
      parsedBody.data,
    );
    return res
      .status(201)
      .json({ data: sharedTicketDetailResponseSchema.parse(detail) });
  } catch (error: unknown) {
    if (sendKnownError(res, error)) return;
    throw error;
  }
};

export const getSharedTicket = async (req: Request, res: Response) => {
  const parsedParams = sharedTicketIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) return sendInvalidInput(res);

  try {
    const detail = await getSharedTicketDetail(
      req.headers.cookie,
      parsedParams.data.sharedTicketId,
    );
    return res
      .status(200)
      .json({ data: sharedTicketDetailResponseSchema.parse(detail) });
  } catch (error: unknown) {
    if (sendKnownError(res, error)) return;
    throw error;
  }
};

export const postIssuedTicket = async (req: Request, res: Response) => {
  const parsedParams = sharedTicketIdParamsSchema.safeParse(req.params);
  const parsedBody = issueTicketRequestSchema.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    return sendInvalidInput(res);
  }

  try {
    const ticket = await issueTicket(
      req.headers.cookie,
      parsedParams.data.sharedTicketId,
      parsedBody.data,
    );
    return res
      .status(201)
      .json({ data: issuedTicketResponseSchema.parse(ticket) });
  } catch (error: unknown) {
    if (sendKnownError(res, error)) return;
    throw error;
  }
};

export const getGroupSharedTickets = async (req: Request, res: Response) => {
  const parsedParams = groupIdParamsSchema.safeParse(req.params);
  const parsedQuery = sharedTicketListQuerySchema.safeParse(req.query);
  if (!parsedParams.success || !parsedQuery.success) {
    return sendInvalidInput(res);
  }

  try {
    const list = await getGroupSharedTicketList(
      req.headers.cookie,
      parsedParams.data.groupId,
      parsedQuery.data.month,
    );
    return res
      .status(200)
      .json({ data: sharedTicketListResponseSchema.parse(list) });
  } catch (error: unknown) {
    if (sendKnownError(res, error)) return;
    throw error;
  }
};
