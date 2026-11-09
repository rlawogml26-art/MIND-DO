import type { Request, Response } from "express";
import {
  EmailAlreadyExistsError,
  signup as signupService,
} from "./auth.service.js";
import {
  ErrorCode,
  signupRequestSchema,
  signupResponseSchema,
} from "@mind-do/shared";

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  cookieSecure: boolean;
};

const setAuthCookies = (res: Response, tokens: SessionTokens) => {
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: tokens.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.accessTokenTtlSeconds * 1000,
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: tokens.cookieSecure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: tokens.refreshTokenTtlSeconds * 1000,
  });
};

export const signup = async (req: Request, res: Response) => {
  const parsed = signupRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const result = await signupService(parsed.data);
    const response = signupResponseSchema.parse({
      userId: result.user.userId,
      email: result.user.email,
      name: result.user.name,
    });

    setAuthCookies(res, result);

    return res.status(201).json({ data: response });
  } catch (error: unknown) {
    if (error instanceof EmailAlreadyExistsError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.EMAIL_ALREADY_EXISTS,
          message: "이미 가입된 이메일입니다.",
        },
      });
    }
    throw error;
  }
};
