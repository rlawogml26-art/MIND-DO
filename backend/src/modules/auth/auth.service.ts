import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcrypt";
import type { SignupRequest } from "@mind-do/shared";
import * as repository from "./auth.repository.js";
import { EmailAlreadyExistsError } from "./auth.repository.js";

export { EmailAlreadyExistsError } from "./auth.repository.js";

export class UnauthorizedError extends Error {}
export class AccessTokenExpiredError extends Error {}

const BCRYPT_ROUNDS = 10;

export type AuthConfiguration = {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  cookieSecure: boolean;
};

function requirePositiveInteger(name: string): number {
  const rawValue = process.env[name];
  const value = Number(rawValue);
  if (!rawValue || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`환경변수 ${name}은(는) 양의 정수여야 합니다.`);
  }
  return value;
}

function getJwtSecret(): string {
  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("환경변수 JWT_SECRET은(는) 32바이트 이상이어야 합니다.");
  }
  return jwtSecret;
}

export function getAuthConfiguration(): AuthConfiguration {
  const cookieSecure = process.env["COOKIE_SECURE"];
  if (cookieSecure !== "true" && cookieSecure !== "false") {
    throw new Error("환경변수 COOKIE_SECURE는 true 또는 false여야 합니다.");
  }

  return {
    jwtSecret: getJwtSecret(),
    accessTokenTtlSeconds: requirePositiveInteger("ACCESS_TOKEN_TTL_SECONDS"),
    refreshTokenTtlSeconds: requirePositiveInteger("REFRESH_TOKEN_TTL_SECONDS"),
    cookieSecure: cookieSecure === "true",
  };
}

export function signAccessToken(
  userId: number,
  issuedAtSeconds: number,
  expiresAtSeconds: number,
  secret: string,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
    }),
  ).toString("base64url");
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function decodeJwtJson(value: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new UnauthorizedError();
  }
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new UnauthorizedError();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function verifyAccessToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): number {
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    parts[0] === undefined ||
    parts[1] === undefined ||
    parts[2] === undefined
  ) {
    throw new UnauthorizedError();
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtJson(encodedHeader);
  const payload = decodeJwtJson(encodedPayload);
  if (
    !isRecord(header) ||
    header["alg"] !== "HS256" ||
    header["typ"] !== "JWT" ||
    !isRecord(payload) ||
    typeof payload["sub"] !== "string" ||
    !/^[1-9]\d*$/.test(payload["sub"]) ||
    typeof payload["iat"] !== "number" ||
    !Number.isSafeInteger(payload["iat"]) ||
    typeof payload["exp"] !== "number" ||
    !Number.isSafeInteger(payload["exp"])
  ) {
    throw new UnauthorizedError();
  }

  const suppliedSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  if (
    !/^[A-Za-z0-9_-]+$/.test(encodedSignature) ||
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new UnauthorizedError();
  }

  if (payload["exp"] <= nowSeconds) {
    throw new AccessTokenExpiredError();
  }
  if (payload["iat"] > nowSeconds) {
    throw new UnauthorizedError();
  }

  const userId = Number(payload["sub"]);
  if (!Number.isSafeInteger(userId)) {
    throw new UnauthorizedError();
  }
  return userId;
}

export function getAccessTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;

  let token: string | undefined;
  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== "accessToken") continue;
    if (token !== undefined) return undefined;

    const value = cookie.slice(separatorIndex + 1).trim();
    if (!value) return undefined;
    token = value;
  }
  return token;
}

export function getAuthenticatedUserId(token: string | undefined): number {
  if (!token) {
    throw new UnauthorizedError();
  }
  return verifyAccessToken(token, getJwtSecret());
}

function createRefreshToken(
  refreshTokenTtlSeconds: number,
  nowSeconds: number,
) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date((nowSeconds + refreshTokenTtlSeconds) * 1000),
  };
}

function createSessionTokens(
  userId: number,
  configuration: AuthConfiguration,
  nowSeconds: number,
  refresh = createRefreshToken(
    configuration.refreshTokenTtlSeconds,
    nowSeconds,
  ),
) {
  return {
    accessToken: signAccessToken(
      userId,
      nowSeconds,
      nowSeconds + configuration.accessTokenTtlSeconds,
      configuration.jwtSecret,
    ),
    refreshToken: refresh.token,
    refreshTokenHash: refresh.tokenHash,
    refreshTokenExpiresAt: refresh.expiresAt,
    accessTokenTtlSeconds: configuration.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: configuration.refreshTokenTtlSeconds,
    cookieSecure: configuration.cookieSecure,
  };
}

export const signup = async (input: SignupRequest) => {
  const configuration = getAuthConfiguration();
  if (await repository.emailExists(input.email)) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const refresh = createRefreshToken(
    configuration.refreshTokenTtlSeconds,
    nowSeconds,
  );
  const user = await repository.createSignup({
    email: input.email,
    name: input.name,
    passwordHash,
    refreshTokenHash: refresh.tokenHash,
    refreshTokenExpiresAt: refresh.expiresAt,
  });

  return {
    user,
    ...createSessionTokens(user.userId, configuration, nowSeconds, refresh),
  };
};
