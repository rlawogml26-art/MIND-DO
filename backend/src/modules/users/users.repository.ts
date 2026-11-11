import { getPrismaClient } from "../../lib/prisma.js";

export const getUserById = (userId: number) =>
  getPrismaClient().user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true, nickname: true },
  });
