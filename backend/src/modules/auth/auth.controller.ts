import type { Request, Response } from "express";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  login as loginService,
  signup as signupService,
} from "./auth.service.js";
import {
  ErrorCode,
  loginRequestSchema,
  loginResponseSchema,
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
export const login = async (req: Request, res: Response) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const result = await loginService(parsed.data);
    const response = loginResponseSchema.parse({
      userId: result.user.userId,
      name: result.user.name,
    });

    setAuthCookies(res, result);
    return res.status(200).json({ data: response });
  } catch (error: unknown) {
    if (error instanceof InvalidCredentialsError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: "이메일 또는 비밀번호가 일치하지 않습니다.",
        },
      });
    }
    throw error;
  }
};
