import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import {
  PHOTO_CONTENT_TYPES,
  PHOTO_UPLOAD_MIN_SIZE_BYTES,
  PHOTO_UPLOAD_MAX_SIZE_BYTES,
} from "@mind-do/shared";
import { getPrismaClient } from "../../lib/prisma.js";
import { aiDraftsConfig } from "./ai-drafts.config.js";

const s3Client = new S3Client({ region: aiDraftsConfig.region });

export type AiDraftAccessStatus =
  | "allowed"
  | "shared_ticket_not_found"
  | "not_invited"
  | "ticket_already_completed";

export async function checkAiDraftAccess(
  sharedTicketId: number,
  userId: number,
): Promise<AiDraftAccessStatus> {
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

  if (!sharedTicket) return "shared_ticket_not_found";
  if (sharedTicket.invitees.length === 0) return "not_invited";
  if (sharedTicket.tickets.length > 0) return "ticket_already_completed";
  return "allowed";
}

export async function verifyPhotoObject(photoKey: string): Promise<boolean> {
  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: aiDraftsConfig.bucketName,
        Key: photoKey,
      }),
    );
    if (
      !isPhotoContentType(head.ContentType) ||
      !isValidSize(head.ContentLength)
    ) {
      return false;
    }
    return true;
  } catch (error: unknown) {
    if (isMissingS3Object(error)) return false;
    throw error;
  }
}

export async function readPhotoObject(
  photoKey: string,
): Promise<Buffer | undefined> {
  try {
    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: aiDraftsConfig.bucketName,
        Key: photoKey,
      }),
    );
    if (
      !object.Body ||
      !isPhotoContentType(object.ContentType) ||
      !isValidSize(object.ContentLength)
    ) {
      return undefined;
    }
    const bytes = await object.Body.transformToByteArray();
    if (
      !isValidSize(bytes.byteLength) ||
      bytes.byteLength !== object.ContentLength
    ) {
      return undefined;
    }
    return Buffer.from(bytes);
  } catch (error: unknown) {
    if (isMissingS3Object(error)) return undefined;
    throw error;
  }
}

export async function reserveAiDraft(
  sharedTicketId: number,
  userId: number,
): Promise<boolean> {
  const result = await getPrismaClient().sharedTicketInvitee.updateMany({
    where: {
      sharedTicketId,
      userId,
      aiDraftCount: 0,
      sharedTicket: {
        is: {
          group: {
            is: {
              deletedAt: null,
              members: { some: { userId, leftAt: null } },
            },
          },
          tickets: {
            none: { userId, status: "COMPLETED", deletedAt: null },
          },
        },
      },
    },
    data: { aiDraftCount: { increment: 1 } },
  });
  return result.count === 1;
}

export async function releaseAiDraft(
  sharedTicketId: number,
  userId: number,
): Promise<void> {
  await getPrismaClient().sharedTicketInvitee.updateMany({
    where: { sharedTicketId, userId, aiDraftCount: 1 },
    data: { aiDraftCount: { decrement: 1 } },
  });
}

function isPhotoContentType(
  value: string | undefined,
): value is (typeof PHOTO_CONTENT_TYPES)[number] {
  return PHOTO_CONTENT_TYPES.some((contentType) => contentType === value);
}

function isValidSize(value: number | undefined): value is number {
  return (
    value !== undefined &&
    value >= PHOTO_UPLOAD_MIN_SIZE_BYTES &&
    value <= PHOTO_UPLOAD_MAX_SIZE_BYTES
  );
}

function isMissingS3Object(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    (error.name === "NoSuchKey" ||
      error.name === "NotFound" ||
      error.$metadata.httpStatusCode === 404)
  );
}
