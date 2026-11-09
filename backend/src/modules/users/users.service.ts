import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
  UnauthorizedError,
} from "../auth/auth.service.js";
import * as repository from "./users.repository.js";

export const getCurrentUser = async (cookieHeader: string | undefined) => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const user = await repository.getUserById(userId);
  if (!user) throw new UnauthorizedError();

  return {
    userId: user.id,
    email: user.email,
    name: user.nickname,
  };
};
