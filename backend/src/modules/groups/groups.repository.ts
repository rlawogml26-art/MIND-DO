import { GROUP_MAX_MEMBERS, USER_GROUP_MAX } from "@mind-do/shared";
import { getPrismaClient } from "../../lib/prisma.js";

type CreateGroupRecordInput = {
  userId: number;
  name: string;
};

export const createGroupForUser = ({ userId, name }: CreateGroupRecordInput) =>
  getPrismaClient().$transaction(async (transaction) => {
    const lockedUsers = await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM users WHERE id = ${userId} FOR UPDATE
    `;
    if (lockedUsers.length === 0) return { status: "user_not_found" as const };

    const currentGroupCount = await transaction.groupMember.count({
      where: {
        userId,
        leftAt: null,
        group: { isDefault: false, deletedAt: null },
      },
    });
    if (currentGroupCount >= USER_GROUP_MAX) {
      return { status: "group_limit_exceeded" as const };
    }

    const group = await transaction.group.create({
      data: { name, isDefault: false, leaderId: userId },
      select: {
        id: true,
        name: true,
        isDefault: true,
        leaderId: true,
        createdAt: true,
      },
    });
    await transaction.groupMember.create({
      data: { groupId: group.id, userId },
    });

    return {
      status: "created" as const,
      group,
      memberCount: 1,
      maxMembers: GROUP_MAX_MEMBERS,
    };
  });

type CreateGroupInviteInput = {
  groupId: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
};

export const createGroupInvite = ({
  groupId,
  userId,
  tokenHash,
  expiresAt,
}: CreateGroupInviteInput) =>
  getPrismaClient().$transaction(async (transaction) => {
    const groups = await transaction.$queryRaw<
      Array<{ id: number; isDefault: boolean }>
    >`
      SELECT id, is_default AS isDefault
      FROM groups
      WHERE id = ${groupId} AND deleted_at IS NULL
      FOR UPDATE
    `;
    const group = groups[0];
    if (!group) return { status: "group_not_found" as const };

    const membership = await transaction.groupMember.findFirst({
      where: { groupId, userId, leftAt: null },
      select: { id: true },
    });
    if (!membership) return { status: "group_not_found" as const };
    if (group.isDefault) {
      return { status: "default_group_not_allowed" as const };
    }

    const memberCount = await transaction.groupMember.count({
      where: { groupId, leftAt: null },
    });
    if (memberCount >= GROUP_MAX_MEMBERS) {
      return { status: "group_full" as const };
    }

    const invite = await transaction.groupInvite.create({
      data: { groupId, tokenHash, createdById: userId, expiresAt },
      select: { expiresAt: true },
    });
    return { status: "created" as const, expiresAt: invite.expiresAt };
  });
