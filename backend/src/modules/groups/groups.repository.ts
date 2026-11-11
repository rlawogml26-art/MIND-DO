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
      FROM \`groups\`
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

type JoinGroupInput = {
  userId: number;
  tokenHash: string;
};

export const joinGroupByInvite = ({ userId, tokenHash }: JoinGroupInput) =>
  getPrismaClient().$transaction(async (transaction) => {
    const lockedUsers = await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM users WHERE id = ${userId} AND deleted_at IS NULL FOR UPDATE
    `;
    if (lockedUsers.length === 0) return { status: "user_not_found" as const };

    const now = new Date();
    const invites = await transaction.$queryRaw<
      Array<{ groupId: number; groupName: string }>
    >`
      SELECT g.id AS groupId, g.name AS groupName
      FROM group_invites AS i
      INNER JOIN \`groups\` AS g ON g.id = i.group_id
      WHERE i.token_hash = ${tokenHash}
        AND i.expires_at > ${now}
        AND i.revoked_at IS NULL
        AND g.deleted_at IS NULL
      FOR UPDATE
    `;
    const invite = invites[0];
    if (!invite) return { status: "invite_invalid" as const };

    const existingMembership = await transaction.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: invite.groupId, userId },
      },
      select: { id: true, leftAt: true },
    });
    if (existingMembership?.leftAt === null) {
      return { status: "already_group_member" as const };
    }

    const memberCount = await transaction.groupMember.count({
      where: { groupId: invite.groupId, leftAt: null },
    });
    if (memberCount >= GROUP_MAX_MEMBERS) {
      return { status: "group_full" as const };
    }

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

    const membership = existingMembership
      ? await transaction.groupMember.update({
          where: { id: existingMembership.id },
          data: { leftAt: null, joinedAt: now },
          select: { joinedAt: true },
        })
      : await transaction.groupMember.create({
          data: { groupId: invite.groupId, userId },
          select: { joinedAt: true },
        });

    return {
      status: "joined" as const,
      groupId: invite.groupId,
      groupName: invite.groupName,
      memberCount: memberCount + 1,
      joinedAt: membership.joinedAt,
    };
  });
