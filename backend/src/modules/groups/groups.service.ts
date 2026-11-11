import {
  DEFAULT_GROUP_MAX_MEMBERS,
  ErrorCode,
  GROUP_INVITE_TTL_HOURS_MIN,
  GROUP_MAX_MEMBERS,
  GROUP_ROLE_LEADER,
  GROUP_ROLE_MEMBER,
  USER_GROUP_MAX,
  type CreateGroupRequest,
  type GroupDetailResponse,
  type GroupListResponse,
  type InviteInfoResponse,
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

const roleOf = (
  leaderId: number,
  userId: number,
): typeof GROUP_ROLE_LEADER | typeof GROUP_ROLE_MEMBER =>
  leaderId === userId ? GROUP_ROLE_LEADER : GROUP_ROLE_MEMBER;

const maxMembersOf = (isDefault: boolean) =>
  isDefault ? DEFAULT_GROUP_MAX_MEMBERS : GROUP_MAX_MEMBERS;

// 참여 그룹 목록. 기본 1인 그룹이 항상 맨 앞, 나머지는 들어온 순서
export const getMyGroups = async (
  cookieHeader: string | undefined,
): Promise<GroupListResponse> => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const rows = await repository.findGroupsForUser(userId);
  const groups = rows
    .map(({ group }) => ({
      groupId: group.id,
      name: group.name,
      isDefault: group.isDefault,
      myRole: roleOf(group.leaderId, userId),
      memberCount: group._count.members,
      maxMembers: maxMembersOf(group.isDefault),
      createdAt: group.createdAt.toISOString(),
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const joinedCount = groups.filter((group) => !group.isDefault).length;
  return {
    groups,
    joinableCount: Math.max(0, USER_GROUP_MAX - joinedCount),
  };
};

// 그룹 상세. 멤버는 그룹장이 맨 앞, 나머지는 들어온 순서
export const getGroupDetail = async (
  cookieHeader: string | undefined,
  groupId: number,
): Promise<GroupDetailResponse> => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const group = await repository.findGroupDetailForMember(groupId, userId);
  if (!group) throw new GroupNotFoundError();

  const members = group.members
    .map((member) => ({
      userId: member.userId,
      name: member.user.nickname,
      role: roleOf(group.leaderId, member.userId),
      joinedAt: member.joinedAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        Number(b.role === GROUP_ROLE_LEADER) -
        Number(a.role === GROUP_ROLE_LEADER),
    );

  return {
    groupId: group.id,
    name: group.name,
    isDefault: group.isDefault,
    leaderId: group.leaderId,
    myRole: roleOf(group.leaderId, userId),
    memberCount: members.length,
    maxMembers: maxMembersOf(group.isDefault),
    createdAt: group.createdAt.toISOString(),
    members,
  };
};

// 초대 링크 조회. 가입은 하지 않고, 요청자 기준 가입 가능 여부만 계산한다
export const getInviteInfo = async (
  cookieHeader: string | undefined,
  token: string,
): Promise<InviteInfoResponse> => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await repository.findValidInvite(tokenHash, new Date());
  if (!invite) throw new InviteInvalidError();

  const { group } = invite;
  const memberCount = group._count.members;
  const alreadyMember = await repository.isCurrentGroupMember(group.id, userId);
  const joinedCount = alreadyMember
    ? 0
    : await repository.countJoinedGroups(userId);
  const cannotJoinReason = alreadyMember
    ? ErrorCode.ALREADY_GROUP_MEMBER
    : memberCount >= GROUP_MAX_MEMBERS
      ? ErrorCode.GROUP_FULL
      : joinedCount >= USER_GROUP_MAX
        ? ErrorCode.GROUP_LIMIT_EXCEEDED
        : null;

  return {
    groupId: group.id,
    groupName: group.name,
    leaderName: group.leader.nickname,
    memberCount,
    maxMembers: GROUP_MAX_MEMBERS,
    expiresAt: invite.expiresAt.toISOString(),
    alreadyMember,
    canJoin: cannotJoinReason === null,
    cannotJoinReason,
  };
};
