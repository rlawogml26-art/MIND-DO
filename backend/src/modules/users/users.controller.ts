import type { Request, Response } from "express";
import { currentUserResponseSchema, ErrorCode } from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";
import * as service from "./users.service.js";

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await service.getCurrentUser(req.headers.cookie);
    return res
      .status(200)
      .json({ data: currentUserResponseSchema.parse(user) });
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
};
