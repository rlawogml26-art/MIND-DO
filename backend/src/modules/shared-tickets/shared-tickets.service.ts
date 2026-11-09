import {
  PHOTO_CONTENT_TYPES,
  PHOTO_UPLOAD_MAX_SIZE_BYTES,
  PHOTO_UPLOAD_MIN_SIZE_BYTES,
  type SharedTicketPhotoUploadRequest,
} from "@mind-do/shared";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
} from "../auth/auth.service.js";
import * as repository from "./shared-tickets.repository.js";

export class SharedTicketNotFoundError extends Error {}
export class NotInvitedError extends Error {}
export class TicketAlreadyCompletedError extends Error {}

const PHOTO_EXTENSIONS: Record<(typeof PHOTO_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

function getUploadConfiguration() {
  const bucket = process.env["S3_BUCKET_NAME"];
  const region = process.env["AWS_REGION"];
  if (!bucket) throw new Error("환경변수 S3_BUCKET_NAME이 필요합니다.");
  if (!region) throw new Error("환경변수 AWS_REGION이 필요합니다.");

  const rawExpiresIn = process.env["S3_UPLOAD_URL_EXPIRES_IN_SECONDS"]?.trim();
  if (!rawExpiresIn) {
    throw new Error("환경변수 S3_UPLOAD_URL_EXPIRES_IN_SECONDS가 필요합니다.");
  }
  const expiresInSeconds = Number(rawExpiresIn);
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error(
      "환경변수 S3_UPLOAD_URL_EXPIRES_IN_SECONDS은(는) 양의 정수여야 합니다.",
    );
  }

  return { bucket, region, expiresInSeconds };
}

export const createSharedTicketPhotoUploadUrls = async (
  cookieHeader: string | undefined,
  sharedTicketId: number,
  input: SharedTicketPhotoUploadRequest,
) => {
  const userId = getAuthenticatedUserId(
    getAccessTokenFromCookieHeader(cookieHeader),
  );
  const access = await repository.checkPhotoUploadAccess({
    sharedTicketId,
    userId,
  });
  if (access.status === "shared_ticket_not_found") {
    throw new SharedTicketNotFoundError();
  }
  if (access.status === "not_invited") throw new NotInvitedError();
  if (access.status === "ticket_already_completed") {
    throw new TicketAlreadyCompletedError();
  }

  const { bucket, region, expiresInSeconds } = getUploadConfiguration();
  const s3Client = new S3Client({ region });
  const uploads = await Promise.all(
    input.files.map(async ({ contentType }) => {
      const photoKey = `tickets/${sharedTicketId}/${userId}/${randomUUID()}.${PHOTO_EXTENSIONS[contentType]}`;
      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: bucket,
        Key: photoKey,
        Expires: expiresInSeconds,
        Fields: { key: photoKey, "Content-Type": contentType },
        Conditions: [
          [
            "content-length-range",
            PHOTO_UPLOAD_MIN_SIZE_BYTES,
            PHOTO_UPLOAD_MAX_SIZE_BYTES,
          ],
          { key: photoKey },
          { "Content-Type": contentType },
        ],
      });

      return { photoKey, url, fields };
    }),
  );

  return { uploads, expiresInSeconds };
};
