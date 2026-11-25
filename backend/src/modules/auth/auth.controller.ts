import type { CookieOptions, Request, Response } from "express";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  login as loginService,
  logout as logoutService,
  refresh as refreshService,
  signup as signupService,
  UnauthorizedError,
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

// 쿠키를 지울 때도 설정할 때와 이름·path·속성이 같아야 브라우저·앱이 같은 쿠키로 알아본다
const accessCookieOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/",
});
const refreshCookieOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/api/auth",
});

const setAuthCookies = (res: Response, tokens: SessionTokens) => {
  res.cookie("accessToken", tokens.accessToken, {
    ...accessCookieOptions(tokens.cookieSecure),
    maxAge: tokens.accessTokenTtlSeconds * 1000,
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    ...refreshCookieOptions(tokens.cookieSecure),
    maxAge: tokens.refreshTokenTtlSeconds * 1000,
  });
};

const clearAuthCookies = (res: Response, cookieSecure: boolean) => {
  res.clearCookie("accessToken", accessCookieOptions(cookieSecure));
  res.clearCookie("refreshToken", refreshCookieOptions(cookieSecure));
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

export const refresh = async (req: Request, res: Response) => {
  try {
    const result = await refreshService(req.headers.cookie);
    setAuthCookies(res, result);
    return res.status(200).json({ data: {} });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_REFRESH_TOKEN,
          message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
        },
      });
    }
    throw error;
  }
};

export const logout = async (req: Request, res: Response) => {
  const result = await logoutService(req.headers.cookie);
  clearAuthCookies(res, result.cookieSecure);
  return res.status(200).json({ data: {} });
};
