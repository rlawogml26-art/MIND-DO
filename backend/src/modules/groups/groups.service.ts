import {
  GROUP_INVITE_TTL_HOURS_MIN,
  GROUP_ROLE_LEADER,
  GROUP_ROLE_MEMBER,
  type CreateGroupRequest,
} from "@mind-do/shared";
import { createHash, randomBytes } from "node:crypto";
import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
  UnauthorizedError,
} from "../auth/auth.service.js";
import * as repository from "./groups.repository.js";

export class GroupLimitExceededError extends Error {}
export class GroupNotFoundError extends Error {}
export class DefaultGroupNotAllowedError extends Error {}
export class GroupFullError extends Error {}
export class InviteInvalidError extends Error {}
export class AlreadyGroupMemberError extends Error {}

function getInviteConfiguration() {
  const rawTtlHours = process.env["INVITE_LINK_TTL_HOURS"];
  const ttlHours = Number(rawTtlHours);
  if (
    !rawTtlHours ||
    !Number.isSafeInteger(ttlHours) ||
    ttlHours < GROUP_INVITE_TTL_HOURS_MIN
  ) {
    throw new Error(
      `환경변수 INVITE_LINK_TTL_HOURS는 ${GROUP_INVITE_TTL_HOURS_MIN} 이상의 정수여야 합니다.`,
    );
  }

  const rawBaseUrl = process.env["INVITE_BASE_URL"];
  if (!rawBaseUrl) {
    throw new Error("환경변수 INVITE_BASE_URL이 필요합니다.");
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl);
  } catch {
    throw new Error("환경변수 INVITE_BASE_URL 형식이 올바르지 않습니다.");
  }
  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("환경변수 INVITE_BASE_URL은 유효한 origin이어야 합니다.");
  }

  return { ttlHours, baseUrl: baseUrl.origin };
}

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

export const createGroupInvite = async (
  cookieHeader: string | undefined,
  groupId: number,
) => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const { ttlHours, baseUrl } = getInviteConfiguration();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const result = await repository.createGroupInvite({
    groupId,
    userId,
    tokenHash,
    expiresAt,
  });

  if (result.status === "group_not_found") throw new GroupNotFoundError();
  if (result.status === "default_group_not_allowed") {
    throw new DefaultGroupNotAllowedError();
  }
  if (result.status === "group_full") throw new GroupFullError();

  return {
    token,
    inviteUrl: new URL(`/invite/${token}`, baseUrl).toString(),
    expiresAt: result.expiresAt.toISOString(),
  };
};

export const joinGroupByInvite = async (
  cookieHeader: string | undefined,
  token: string,
) => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await repository.joinGroupByInvite({ userId, tokenHash });

  if (result.status === "user_not_found") throw new UnauthorizedError();
  if (result.status === "invite_invalid") throw new InviteInvalidError();
  if (result.status === "already_group_member") {
    throw new AlreadyGroupMemberError();
  }
  if (result.status === "group_full") throw new GroupFullError();
  if (result.status === "group_limit_exceeded") {
    throw new GroupLimitExceededError();
  }

  return {
    groupId: result.groupId,
    groupName: result.groupName,
    myRole: GROUP_ROLE_MEMBER,
    memberCount: result.memberCount,
    joinedAt: result.joinedAt.toISOString(),
  };
};
