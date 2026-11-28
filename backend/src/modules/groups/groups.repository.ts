import { GROUP_MAX_MEMBERS, USER_GROUP_MAX } from "@mind-do/shared";
import type { Prisma } from "../../generated/prisma/client.js";
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

// 참여 그룹 목록: 지금 멤버인 그룹(삭제된 그룹 제외), 들어온 순서
export const findGroupsForUser = (userId: number) =>
  getPrismaClient().groupMember.findMany({
    where: { userId, leftAt: null, group: { deletedAt: null } },
    orderBy: { joinedAt: "asc" },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          isDefault: true,
          leaderId: true,
          createdAt: true,
          _count: { select: { members: { where: { leftAt: null } } } },
        },
      },
    },
  });

// 그룹 상세: 요청자가 지금 멤버가 아니면 null (없는 그룹과 구분하지 않는다)
export const findGroupDetailForMember = async (
  groupId: number,
  userId: number,
) => {
  const membership = await getPrismaClient().groupMember.findFirst({
    where: { groupId, userId, leftAt: null, group: { deletedAt: null } },
    select: { id: true },
  });
  if (!membership) return null;

  return getPrismaClient().group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      isDefault: true,
      leaderId: true,
      createdAt: true,
      members: {
        where: { leftAt: null },
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          joinedAt: true,
          user: { select: { nickname: true } },
        },
      },
    },
  });
};

// 초대 링크 조회: 만료 전·무효 아님·그룹 삭제 안 됨인 링크만
export const findValidInvite = (tokenHash: string, now: Date) =>
  getPrismaClient().groupInvite.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
      revokedAt: null,
      group: { deletedAt: null },
    },
    select: {
      expiresAt: true,
      group: {
        select: {
          id: true,
          name: true,
          leader: { select: { nickname: true } },
          _count: { select: { members: { where: { leftAt: null } } } },
        },
      },
    },
  });

export const isCurrentGroupMember = async (groupId: number, userId: number) =>
  (await getPrismaClient().groupMember.count({
    where: { groupId, userId, leftAt: null },
  })) > 0;

// 기본 1인 그룹을 뺀 참여 그룹 수 (그룹 수 제한 계산용)
export const countJoinedGroups = (userId: number) =>
  getPrismaClient().groupMember.count({
    where: {
      userId,
      leftAt: null,
      group: { isDefault: false, deletedAt: null },
    },
  });

type LeaveGroupInput = {
  groupId: number;
  userId: number;
  keepTickets: boolean;
};

// 그룹 나가기. 개인 티켓 원본은 지우지 않는다 (원본 삭제와 다른 동작).
// 나간 사람의 티켓·슬롯 정리는 나가기와 같은 잠금 안에서 해야 해서, 그룹 기능 안에서 티켓·초대자 표를 함께 고친다.
async function lockActiveGroup(
  transaction: Prisma.TransactionClient,
  groupId: number,
) {
  // 그룹 멤버십과 그룹장 변경을 직렬화해 권한 검사와 갱신 사이의 변경을 막는다.
  const groups = await transaction.$queryRaw<
    Array<{ isDefault: boolean; leaderId: number }>
  >`
    SELECT is_default AS isDefault, leader_id AS leaderId
    FROM \`groups\`
    WHERE id = ${groupId} AND deleted_at IS NULL
    FOR UPDATE
  `;
  return groups[0];
}

export const transferGroupLeader = (
  groupId: number,
  requesterId: number,
  targetUserId: number,
) =>
  getPrismaClient().$transaction(async (transaction) => {
    const group = await lockActiveGroup(transaction, groupId);
    if (!group) return { status: "group_not_found" as const };

    const members = await transaction.groupMember.findMany({
      where: {
        groupId,
        leftAt: null,
        userId: { in: [requesterId, targetUserId] },
      },
      select: { userId: true },
    });
    if (!members.some(({ userId }) => userId === requesterId)) {
      return { status: "group_not_found" as const };
    }
    if (Number(group.leaderId) !== requesterId) {
      return { status: "not_group_leader" as const };
    }
    if (group.isDefault)
      return { status: "default_group_not_allowed" as const };
    if (requesterId === targetUserId)
      return { status: "invalid_input" as const };
    if (!members.some(({ userId }) => userId === targetUserId)) {
      return { status: "member_not_found" as const };
    }

    const { leaderId } = await transaction.group.update({
      where: { id: groupId },
      data: { leaderId: targetUserId },
      select: { leaderId: true },
    });
    return { status: "transferred" as const, leaderId };
  });

export const leaveGroup = ({ groupId, userId, keepTickets }: LeaveGroupInput) =>
  getPrismaClient().$transaction(async (transaction) => {
    const group = await lockActiveGroup(transaction, groupId);
    if (!group) return { status: "group_not_found" as const };

    const membership = await transaction.groupMember.findFirst({
      where: { groupId, userId, leftAt: null },
      select: { id: true },
    });
    if (!membership) return { status: "group_not_found" as const };
    if (group.isDefault) {
      return { status: "default_group_not_allowed" as const };
    }

    const now = new Date();
    await transaction.groupMember.update({
      where: { id: membership.id },
      data: { leftAt: now },
    });

    // 개인 티켓 저장(createIssuedTicket)도 초대자 행을 먼저 잠그므로, 저장과 나가기가 겹쳐도
    // "미완성"으로 보고 지운 슬롯에 티켓이 새로 생기지 않는다
    const mySlots = await transaction.$queryRaw<
      Array<{ sharedTicketId: number }>
    >`
      SELECT sti.shared_ticket_id AS sharedTicketId
      FROM shared_ticket_invitees sti
      JOIN shared_tickets st ON st.id = sti.shared_ticket_id
      WHERE st.group_id = ${groupId} AND sti.user_id = ${userId}
      FOR UPDATE
    `;
    const groupSharedTickets = await transaction.sharedTicket.findMany({
      where: { groupId },
      select: { id: true },
    });
    const groupSharedTicketIds = groupSharedTickets.map(({ id }) => id);

    let removedSlotIds = mySlots.map(({ sharedTicketId }) =>
      Number(sharedTicketId),
    );
    if (keepTickets) {
      const completed = await transaction.ticket.findMany({
        where: {
          userId,
          sharedTicketId: { in: groupSharedTicketIds },
          status: "COMPLETED",
          deletedAt: null,
        },
        select: { sharedTicketId: true },
      });
      const keptSlotIds = new Set(
        completed.map(({ sharedTicketId }) => sharedTicketId),
      );
      removedSlotIds = removedSlotIds.filter((id) => !keptSlotIds.has(id));
    }

    // 지우는 슬롯에 남은 미완성·삭제된 티켓의 연결도 끊는다. 남겨 두면 다시 들어와 초대받았을 때
    // (shared_ticket_id, user_id) 고유 키에 걸려 새 개인 티켓을 저장할 수 없다
    await transaction.ticket.updateMany({
      where: {
        userId,
        sharedTicketId: {
          in: keepTickets ? removedSlotIds : groupSharedTicketIds,
        },
      },
      data: { sharedTicketId: null },
    });
    await transaction.sharedTicketInvitee.deleteMany({
      where: { userId, sharedTicketId: { in: removedSlotIds } },
    });

    const firstRemaining = await transaction.groupMember.findFirst({
      where: { groupId, leftAt: null },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      select: { userId: true },
    });
    if (!firstRemaining) {
      // 혼자 남은 그룹 삭제도 그룹 연결 제거다. keepTickets와 관계없이 모든 연결을 끊고 원본은 각자 보관함에 남긴다
      await transaction.ticket.updateMany({
        where: { sharedTicketId: { in: groupSharedTicketIds } },
        data: { sharedTicketId: null },
      });
      await transaction.group.update({
        where: { id: groupId },
        data: { deletedAt: now },
      });
      return {
        status: "left" as const,
        groupDeleted: true,
        newLeaderId: null,
      };
    }

    if (Number(group.leaderId) !== userId) {
      return {
        status: "left" as const,
        groupDeleted: false,
        newLeaderId: null,
      };
    }

    await transaction.group.update({
      where: { id: groupId },
      data: { leaderId: firstRemaining.userId },
    });
    return {
      status: "left" as const,
      groupDeleted: false,
      newLeaderId: firstRemaining.userId,
    };
  });
