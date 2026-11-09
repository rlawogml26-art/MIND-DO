import { z } from "zod";

export const PHOTO_UPLOAD_MIN_COUNT = 1;
export const PHOTO_UPLOAD_MAX_COUNT = 4;
export const PHOTO_UPLOAD_MIN_SIZE_BYTES = 1;
export const PHOTO_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
] as const;

export const sharedTicketPhotoUploadParamsSchema = z.object({
  sharedTicketId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
});

export const sharedTicketPhotoUploadRequestSchema = z.object({
  files: z
    .array(
      z.object({
        contentType: z.enum(PHOTO_CONTENT_TYPES),
        size: z
          .number()
          .int()
          .min(PHOTO_UPLOAD_MIN_SIZE_BYTES)
          .max(PHOTO_UPLOAD_MAX_SIZE_BYTES),
      }),
    )
    .min(PHOTO_UPLOAD_MIN_COUNT)
    .max(PHOTO_UPLOAD_MAX_COUNT),
});

export const photoUploadFieldsSchema = z
  .object({
    key: z.string(),
    "Content-Type": z.enum(PHOTO_CONTENT_TYPES),
    Policy: z.string(),
    "X-Amz-Algorithm": z.string(),
    "X-Amz-Credential": z.string(),
    "X-Amz-Date": z.string(),
    "X-Amz-Signature": z.string(),
  })
  .catchall(z.string());

export const sharedTicketPhotoUploadUrlsResponseSchema = z.object({
  uploads: z.array(
    z.object({
      photoKey: z.string(),
      url: z.url(),
      fields: photoUploadFieldsSchema,
    }),
  ),
  expiresInSeconds: z.number().int().positive(),
});

export type SharedTicketPhotoUploadRequest = z.infer<
  typeof sharedTicketPhotoUploadRequestSchema
>;
export type SharedTicketPhotoUploadUrlsResponse = z.infer<
  typeof sharedTicketPhotoUploadUrlsResponseSchema
>;
