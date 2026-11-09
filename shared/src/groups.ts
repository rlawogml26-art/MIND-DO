import { z } from "zod";

export const GROUP_NAME_MAX = 8;
export const USER_GROUP_MAX = 4;
export const GROUP_MAX_MEMBERS = 6;
export const GROUP_ROLE_LEADER = "LEADER";
export const GROUP_ROLE_MEMBER = "MEMBER";

export const groupNameSchema = z.string().trim().min(1).max(GROUP_NAME_MAX);

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

export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;
