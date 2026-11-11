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
