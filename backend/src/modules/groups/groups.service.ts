import { GROUP_ROLE_LEADER, type CreateGroupRequest } from "@mind-do/shared";
import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
  UnauthorizedError,
} from "../auth/auth.service.js";
import * as repository from "./groups.repository.js";

export class GroupLimitExceededError extends Error {}

export const createGroup = async (
  cookieHeader: string | undefined,
  input: CreateGroupRequest,
) => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const result = await repository.createGroupForUser({
    userId,
    name: input.name,
  });

  if (result.status === "group_limit_exceeded") {
    throw new GroupLimitExceededError();
  }
  if (result.status === "user_not_found") {
    throw new UnauthorizedError();
  }

  return {
    groupId: result.group.id,
    name: result.group.name,
    isDefault: result.group.isDefault,
    leaderId: result.group.leaderId,
    myRole: GROUP_ROLE_LEADER,
    memberCount: result.memberCount,
    maxMembers: result.maxMembers,
    createdAt: result.group.createdAt.toISOString(),
  };
};
