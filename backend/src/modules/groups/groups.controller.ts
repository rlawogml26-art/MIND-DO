import type { Request, Response } from "express";
import {
  createGroupRequestSchema,
  ErrorCode,
  groupResponseSchema,
  USER_GROUP_MAX,
} from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";
import { createGroup, GroupLimitExceededError } from "./groups.service.js";

export const postGroup = async (req: Request, res: Response) => {
  const parsed = createGroupRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const group = await createGroup(req.headers.cookie, parsed.data);
    return res.status(201).json({ data: groupResponseSchema.parse(group) });
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
    if (error instanceof GroupLimitExceededError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.GROUP_LIMIT_EXCEEDED,
          message: `참여 중인 그룹은 최대 ${USER_GROUP_MAX}개까지 가능합니다.`,
        },
      });
    }
    throw error;
  }
};
