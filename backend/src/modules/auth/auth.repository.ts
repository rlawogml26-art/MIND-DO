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

export const findRefreshToken = (tokenHash: string) =>
  getPrismaClient().refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { deletedAt: true } },
    },
  });

// 쓴 토큰을 무효로 하고 새 토큰을 넣는다 (로테이션).
// 같은 토큰으로 갱신 요청이 동시에 두 번 오면 한쪽만 무효화에 성공한다. 진 쪽은 false를 받아
// 이미 쓴 토큰이 다시 들어온 것과 똑같이 처리된다 (AGENTS.md: 앱은 갱신 요청을 한 번에 하나만 보낸다)
export const rotateRefreshToken = async (
  oldTokenId: number,
  userId: number,
  newTokenHash: string,
  newExpiresAt: Date,
): Promise<boolean> =>
  getPrismaClient().$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: { id: oldTokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) return false;
    await transaction.refreshToken.create({
      data: { userId, tokenHash: newTokenHash, expiresAt: newExpiresAt },
    });
    return true;
  });

export const revokeAllRefreshTokens = async (userId: number): Promise<void> => {
  await getPrismaClient().refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeRefreshToken = async (tokenHash: string): Promise<void> => {
  await getPrismaClient().refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
