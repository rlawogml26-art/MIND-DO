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
