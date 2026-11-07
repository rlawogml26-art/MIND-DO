import {
  getAuthenticatedUserId,
  UnauthorizedError,
} from "../auth/auth.service.js";
import * as repository from "./users.repository.js";

function getAccessToken(cookieHeader: string | undefined): string | undefined {
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

export const getCurrentUser = async (cookieHeader: string | undefined) => {
  const userId = getAuthenticatedUserId(getAccessToken(cookieHeader));
  const user = await repository.getUserById(userId);
  if (!user) throw new UnauthorizedError();

  return {
    userId: user.id,
    email: user.email,
    name: user.nickname,
  };
};
