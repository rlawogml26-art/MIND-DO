import { Prisma } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../lib/prisma.js";

type CheckPhotoUploadAccessInput = {
  sharedTicketId: number;
  userId: number;
};

export const checkPhotoUploadAccess = async ({
  sharedTicketId,
  userId,
}: CheckPhotoUploadAccessInput) => {
  const sharedTicket = await getPrismaClient().sharedTicket.findFirst({
    where: {
      id: sharedTicketId,
      group: {
        deletedAt: null,
        members: { some: { userId, leftAt: null } },
      },
    },
    select: {
      invitees: {
        where: { userId },
        select: { id: true },
      },
      tickets: {
        where: { userId, status: "COMPLETED", deletedAt: null },
        select: { id: true },
      },
    },
  });

  if (!sharedTicket) return { status: "shared_ticket_not_found" as const };
  if (sharedTicket.invitees.length === 0) {
    return { status: "not_invited" as const };
  }
  if (sharedTicket.tickets.length > 0) {
    return { status: "ticket_already_completed" as const };
  }
  return { status: "allowed" as const };
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
const fromDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

type CreateSharedTicketInput = {
  groupId: number;
  userId: number;
  ticketDate: string;
  title: string | null;
  // 생성자가 맨 앞. 이 순서대로 행을 넣어 슬롯 순서(생성자 → 초대 순서)가 된다.
  inviteeIds: number[];
};

export const createSharedTicket = async ({
  groupId,
  userId,
  ticketDate,
  title,
  inviteeIds,
}: CreateSharedTicketInput) => {
  try {
    return await getPrismaClient().$transaction(async (transaction) => {
      const group = await transaction.group.findFirst({
        where: {
          id: groupId,
          deletedAt: null,
          members: { some: { userId, leftAt: null } },
        },
        select: { name: true },
      });
      if (!group) return { status: "group_not_found" as const };

      const members = await transaction.groupMember.findMany({
        where: { groupId, leftAt: null, userId: { in: inviteeIds } },
        select: { userId: true, user: { select: { nickname: true } } },
      });
      if (members.length !== inviteeIds.length) {
        return { status: "invalid_invitee" as const };
      }
      const nicknameByUserId = new Map(
        members.map((member) => [member.userId, member.user.nickname]),
      );

      const sharedTicket = await transaction.sharedTicket.create({
        data: {
          groupId,
          ticketDate: fromDateOnly(ticketDate),
          title,
          groupName: group.name,
          creatorId: userId,
        },
        select: { id: true },
      });
      for (const inviteeId of inviteeIds) {
        await transaction.sharedTicketInvitee.create({
          data: {
            sharedTicketId: sharedTicket.id,
            userId: inviteeId,
            nickname: nicknameByUserId.get(inviteeId) ?? "",
          },
        });
      }
      return { status: "created" as const, sharedTicketId: sharedTicket.id };
    });
  } catch (error: unknown) {
    // 같은 그룹·같은 날짜를 두 사람이 동시에 만들면 늦은 쪽이 고유 키에 걸린다.
    if (isUniqueViolation(error)) return { status: "date_taken" as const };
    throw error;
  }
};

type FindSharedTicketDetailInput = {
  sharedTicketId: number;
  userId: number;
};

// 요청자가 그 그룹의 현재 멤버일 때만 찾는다. 초대자가 아니어도 볼 수 있다.
export const findSharedTicketDetail = async ({
  sharedTicketId,
  userId,
}: FindSharedTicketDetailInput) => {
  const sharedTicket = await getPrismaClient().sharedTicket.findFirst({
    where: {
      id: sharedTicketId,
      group: {
        deletedAt: null,
        members: { some: { userId, leftAt: null } },
      },
    },
    select: {
      id: true,
      groupId: true,
      groupName: true,
      ticketDate: true,
      title: true,
      creatorId: true,
      createdAt: true,
      group: {
        select: {
          leaderId: true,
          members: { where: { leftAt: null }, select: { userId: true } },
        },
      },
      invitees: {
        orderBy: { id: "asc" },
        select: { userId: true, nickname: true },
      },
      tickets: {
        where: { status: "COMPLETED", deletedAt: null },
        select: {
          id: true,
          userId: true,
          memo: true,
          design: true,
          createdAt: true,
          images: {
            orderBy: { sortOrder: "asc" },
            select: { s3Key: true, sortOrder: true },
          },
        },
      },
    },
  });
  if (!sharedTicket) return null;

  return {
    sharedTicketId: sharedTicket.id,
    groupId: sharedTicket.groupId,
    groupName: sharedTicket.groupName,
    ticketDate: toDateOnly(sharedTicket.ticketDate),
    title: sharedTicket.title,
    creatorId: sharedTicket.creatorId,
    createdAt: sharedTicket.createdAt,
    leaderId: sharedTicket.group.leaderId,
    currentMemberIds: sharedTicket.group.members.map((member) => member.userId),
    invitees: sharedTicket.invitees,
    tickets: sharedTicket.tickets.map((ticket) => ({
      ticketId: ticket.id,
      userId: ticket.userId,
      memo: ticket.memo,
      design: ticket.design,
      createdAt: ticket.createdAt,
      photos: ticket.images.map((image) => ({
        photoKey: image.s3Key,
        sortOrder: image.sortOrder,
      })),
    })),
  };
};

type CreateIssuedTicketInput = {
  sharedTicketId: number;
  userId: number;
  photoKeys: string[];
  memo: string | null;
  design: Prisma.InputJsonValue;
};

export const createIssuedTicket = async ({
  sharedTicketId,
  userId,
  photoKeys,
  memo,
  design,
}: CreateIssuedTicketInput) => {
  try {
    return await getPrismaClient().$transaction(async (transaction) => {
      const sharedTicket = await transaction.sharedTicket.findUnique({
        where: { id: sharedTicketId },
        select: { ticketDate: true },
      });
      if (!sharedTicket) return { status: "shared_ticket_not_found" as const };

      const ticket = await transaction.ticket.create({
        data: {
          userId,
          sharedTicketId,
          visitDate: sharedTicket.ticketDate,
          memo,
          design,
          status: "COMPLETED",
          completedAt: new Date(),
          images: {
            create: photoKeys.map((photoKey, index) => ({
              s3Key: photoKey,
              sortOrder: index + 1,
            })),
          },
        },
        select: { id: true, createdAt: true },
      });
      return {
        status: "created" as const,
        ticketId: ticket.id,
        createdAt: ticket.createdAt,
      };
    });
  } catch (error: unknown) {
    // 같은 슬롯에 동시에 두 번 저장하면 (shared_ticket_id, user_id) 고유 키에 걸린다.
    if (isUniqueViolation(error)) {
      return { status: "ticket_already_completed" as const };
    }
    throw error;
  }
};
