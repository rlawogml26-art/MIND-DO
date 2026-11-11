import { z } from "zod";
import { ErrorCode } from "./errors.js";
import { PROFILE_NICKNAME_MAX } from "./profile.js";

export const GROUP_NAME_MAX = 8;
export const USER_GROUP_MAX = 4;
export const GROUP_MAX_MEMBERS = 6;
// 기본 1인 그룹의 정원 (가입·초대 불가)
export const DEFAULT_GROUP_MAX_MEMBERS = 1;
export const GROUP_ROLE_LEADER = "LEADER";
export const GROUP_ROLE_MEMBER = "MEMBER";
export const GROUP_INVITE_TTL_HOURS_MIN = 1;

export const groupNameSchema = z.string().trim().min(1).max(GROUP_NAME_MAX);

export const groupIdParamsSchema = z.object({
  groupId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
});

export const createGroupRequestSchema = z.object({
  name: groupNameSchema,
});

export const groupResponseSchema = z.object({
  groupId: z.number().int().positive(),
  name: groupNameSchema,
  isDefault: z.boolean(),
  leaderId: z.number().int().positive(),
  myRole: z.literal(GROUP_ROLE_LEADER),
  memberCount: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  maxMembers: z.literal(GROUP_MAX_MEMBERS),
  createdAt: z.iso.datetime(),
});

export const createGroupInviteResponseSchema = z.object({
  token: z.string().min(1),
  inviteUrl: z.url(),
  expiresAt: z.iso.datetime(),
});

export const joinGroupInviteParamsSchema = z.object({
  token: z.string().min(1),
});

export const joinGroupResponseSchema = z.object({
  groupId: z.number().int().positive(),
  groupName: groupNameSchema,
  myRole: z.literal(GROUP_ROLE_MEMBER),
  memberCount: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  joinedAt: z.iso.datetime(),
});

const positiveIdSchema = z.number().int().positive();
const groupRoleSchema = z.enum([GROUP_ROLE_LEADER, GROUP_ROLE_MEMBER]);
const memberNameSchema = z.string().min(1).max(PROFILE_NICKNAME_MAX);

// 참여 그룹 목록 조회 (GET /api/groups)
export const groupSummarySchema = z.object({
  groupId: positiveIdSchema,
  name: groupNameSchema,
  isDefault: z.boolean(),
  myRole: groupRoleSchema,
  memberCount: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  maxMembers: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  createdAt: z.iso.datetime(),
});

export const groupListResponseSchema = z.object({
  groups: z.array(groupSummarySchema),
  // 더 만들거나 들어갈 수 있는 그룹 수 (USER_GROUP_MAX − 기본 그룹 제외 참여 수). 0이면 그룹 만들기를 막는다
  joinableCount: z.number().int().min(0).max(USER_GROUP_MAX),
});

// 그룹 상세 조회 (GET /api/groups/{groupId}). 멤버 목록 포함, 이메일은 넣지 않는다
export const groupMemberSchema = z.object({
  userId: positiveIdSchema,
  name: memberNameSchema,
  role: groupRoleSchema,
  joinedAt: z.iso.datetime(),
});

export const groupDetailResponseSchema = groupSummarySchema.extend({
  leaderId: positiveIdSchema,
  members: z.array(groupMemberSchema).max(GROUP_MAX_MEMBERS),
});

// 초대 링크 조회 (GET /api/invites/{token}). 가입 전이라 멤버 목록·이메일은 넣지 않는다
// 가입 API가 거절할 때 쓰는 에러 코드와 같은 값을 쓴다 (같은 규칙을 두 벌 만들지 않기)
export const GROUP_JOIN_BLOCK_REASONS = [
  ErrorCode.GROUP_FULL,
  ErrorCode.GROUP_LIMIT_EXCEEDED,
  ErrorCode.ALREADY_GROUP_MEMBER,
] as const;

export const inviteInfoResponseSchema = z.object({
  groupId: positiveIdSchema,
  groupName: groupNameSchema,
  leaderName: memberNameSchema,
  memberCount: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  maxMembers: z.number().int().positive().max(GROUP_MAX_MEMBERS),
  expiresAt: z.iso.datetime(),
  alreadyMember: z.boolean(),
  canJoin: z.boolean(),
  cannotJoinReason: z.enum(GROUP_JOIN_BLOCK_REASONS).nullable(),
});

export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;
export type CreateGroupInviteResponse = z.infer<
  typeof createGroupInviteResponseSchema
>;
export type JoinGroupResponse = z.infer<typeof joinGroupResponseSchema>;
export type GroupSummary = z.infer<typeof groupSummarySchema>;
export type GroupListResponse = z.infer<typeof groupListResponseSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;
export type GroupDetailResponse = z.infer<typeof groupDetailResponseSchema>;
export type InviteInfoResponse = z.infer<typeof inviteInfoResponseSchema>;
