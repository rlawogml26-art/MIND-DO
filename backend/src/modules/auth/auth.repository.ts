import { Prisma } from "../../generated/prisma/client.js";
import { getPrismaClient } from "../../lib/prisma.js";

const DEFAULT_GROUP_NAME = "나의 하루";

export class EmailAlreadyExistsError extends Error {}

export const emailExists = async (email: string): Promise<boolean> =>
  (await getPrismaClient().user.findUnique({
    where: { email },
    select: { id: true },
  })) !== null;

export const findUserForLogin = (email: string) =>
  getPrismaClient().user.findUnique({
    where: { email, deletedAt: null },
    select: { id: true, nickname: true, passwordHash: true },
  });

export const createLoginSession = async (
  userId: number,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> => {
  const now = new Date();
  await getPrismaClient().$transaction(async (transaction) => {
    await transaction.refreshToken.deleteMany({
      where: { userId, expiresAt: { lte: now } },
    });
    await transaction.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });
};

type CreateSignupInput = {
  email: string;
  name: string;
  passwordHash: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
};

export const createSignup = async ({
  email,
  name,
  passwordHash,
  refreshTokenHash,
  refreshTokenExpiresAt,
}: CreateSignupInput) => {
  try {
    return await getPrismaClient().$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email, nickname: name, passwordHash },
        select: { id: true, email: true, nickname: true },
      });
      const group = await transaction.group.create({
        data: {
          name: DEFAULT_GROUP_NAME,
          isDefault: true,
          leaderId: user.id,
        },
        select: { id: true },
      });
      await transaction.groupMember.create({
        data: { groupId: group.id, userId: user.id },
      });
      await transaction.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return {
        userId: user.id,
        email: user.email,
        name: user.nickname,
      };
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
};
