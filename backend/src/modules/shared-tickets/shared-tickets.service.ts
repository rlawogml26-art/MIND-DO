import {
  PHOTO_CONTENT_TYPES,
  PHOTO_UPLOAD_MAX_SIZE_BYTES,
  PHOTO_UPLOAD_MIN_SIZE_BYTES,
  SLOT_STATUS_COMPLETED,
  SLOT_STATUS_EMPTY,
  ticketDesignSchema,
  type CreateSharedTicketRequest,
  type IssueTicketRequest,
  type SharedTicketListResponse,
  type SharedTicketSummary,
  type SharedTicketPhotoUploadRequest,
} from "@mind-do/shared";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import {
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
} from "../auth/auth.service.js";
import {
  createPhotoViewUrl,
  photoObjectExists,
} from "../../lib/photo-storage.js";
import * as repository from "./shared-tickets.repository.js";

export class SharedTicketNotFoundError extends Error {}
export class NotInvitedError extends Error {}
export class TicketAlreadyCompletedError extends Error {}
export class GroupNotFoundError extends Error {}
export class InvalidTicketDateError extends Error {}
export class InvalidInviteeError extends Error {}
export class SharedTicketDateTakenError extends Error {}
export class InvalidPhotoKeyError extends Error {}
export class InvalidDesignError extends Error {}

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

const getRequesterId = (cookieHeader: string | undefined) =>
  getAuthenticatedUserId(getAccessTokenFromCookieHeader(cookieHeader));

// "오늘"은 한국시간 기준이다 (API 공통 규칙). en-CA 형식이 YYYY-MM-DD라서 그대로 비교한다.
const todayInKst = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const toPhotoResponses = (photos: { photoKey: string; sortOrder: number }[]) =>
  Promise.all(
    photos.map(async ({ photoKey, sortOrder }) => ({
      url: await createPhotoViewUrl(photoKey),
      sortOrder,
    })),
  );

// 저장된 디자인을 지금 형식으로 검사한다. 맞지 않으면(디자인 형식이 바뀐 뒤의 예전 티켓) null로 내려
// 그 티켓만 빈 디자인으로 보이게 하고, 공동 티켓 전체 조회는 실패하지 않게 한다
const toStoredDesign = (design: unknown) => {
  const parsed = ticketDesignSchema.safeParse(design);
  return parsed.success ? parsed.data : null;
};

export const getSharedTicketDetail = async (
  cookieHeader: string | undefined,
  sharedTicketId: number,
) => {
  const userId = getRequesterId(cookieHeader);
  return buildSharedTicketDetail(sharedTicketId, userId);
};

async function buildSharedTicketDetail(sharedTicketId: number, userId: number) {
  const detail = await repository.findSharedTicketDetail({
    sharedTicketId,
    userId,
  });
  if (!detail) throw new SharedTicketNotFoundError();

  const currentMemberIds = new Set(detail.currentMemberIds);
  const ticketByUserId = new Map(
    detail.tickets.map((ticket) => [ticket.userId, ticket]),
  );

  const slots = await Promise.all(
    detail.invitees.map(async (invitee) => {
      const ticket = ticketByUserId.get(invitee.userId);
      return {
        userId: invitee.userId,
        name: invitee.nickname,
        status: ticket ? SLOT_STATUS_COMPLETED : SLOT_STATUS_EMPTY,
        isCurrentMember: currentMemberIds.has(invitee.userId),
        ticket: ticket
          ? {
              ticketId: ticket.ticketId,
              photos: await toPhotoResponses(ticket.photos),
              memo: ticket.memo,
              design: toStoredDesign(ticket.design),
              createdAt: ticket.createdAt.toISOString(),
            }
          : null,
      };
    }),
  );

  return {
    sharedTicketId: detail.sharedTicketId,
    groupId: detail.groupId,
    groupName: detail.groupName,
    ticketDate: detail.ticketDate,
    title: detail.title,
    creatorId: detail.creatorId,
    // 요청자는 이미 현재 멤버로 확인됐으므로 "생성자이면서 현재 멤버"는 creatorId 비교만으로 충분하다.
    canEdit: detail.creatorId === userId || detail.leaderId === userId,
    createdAt: detail.createdAt.toISOString(),
    slots,
  };
}

export const createSharedTicket = async (
  cookieHeader: string | undefined,
  groupId: number,
  input: CreateSharedTicketRequest,
) => {
  const userId = getRequesterId(cookieHeader);
  if (input.ticketDate > todayInKst()) throw new InvalidTicketDateError();

  const inviteeIds = [
    userId,
    ...input.inviteeIds.filter((inviteeId) => inviteeId !== userId),
  ];
  const result = await repository.createSharedTicket({
    groupId,
    userId,
    ticketDate: input.ticketDate,
    title: input.title,
    inviteeIds,
  });
  if (result.status === "group_not_found") throw new GroupNotFoundError();
  if (result.status === "invalid_invitee") throw new InvalidInviteeError();
  if (result.status === "date_taken") throw new SharedTicketDateTakenError();

  return buildSharedTicketDetail(result.sharedTicketId, userId);
};

export const issueTicket = async (
  cookieHeader: string | undefined,
  sharedTicketId: number,
  input: IssueTicketRequest,
) => {
  const userId = getRequesterId(cookieHeader);
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

  const design = ticketDesignSchema.safeParse(input.design);
  if (!design.success) throw new InvalidDesignError();

  // 사진 업로드 API가 만든 키(tickets/{공동 티켓}/{본인}/...)만 받는다. 남의 슬롯 사진을 가져다 쓰지 못하게 한다.
  const prefix = `tickets/${sharedTicketId}/${userId}/`;
  if (input.photoKeys.some((photoKey) => !photoKey.startsWith(prefix))) {
    throw new InvalidPhotoKeyError();
  }
  const exists = await Promise.all(input.photoKeys.map(photoObjectExists));
  if (exists.includes(false)) throw new InvalidPhotoKeyError();

  const result = await repository.createIssuedTicket({
    sharedTicketId,
    userId,
    photoKeys: input.photoKeys,
    memo: input.memo,
    design: design.data,
  });
  if (result.status === "shared_ticket_not_found") {
    throw new SharedTicketNotFoundError();
  }
  if (result.status === "ticket_already_completed") {
    throw new TicketAlreadyCompletedError();
  }

  return {
    ticketId: result.ticketId,
    sharedTicketId,
    status: SLOT_STATUS_COMPLETED,
    photos: await toPhotoResponses(
      input.photoKeys.map((photoKey, index) => ({
        photoKey,
        sortOrder: index + 1,
      })),
    ),
    memo: input.memo,
    design: design.data,
    createdAt: result.createdAt.toISOString(),
  };
};

// 공동 티켓 목록. 초대받지 않은 공동 티켓도 그룹의 현재 멤버면 볼 수 있다 (API 명세)
export const getGroupSharedTicketList = async (
  cookieHeader: string | undefined,
  groupId: number,
  month: string | undefined,
): Promise<SharedTicketListResponse> => {
  const userId = getRequesterId(cookieHeader);
  const rows = await repository.findGroupSharedTickets({
    groupId,
    userId,
    month,
  });
  if (!rows) throw new GroupNotFoundError();

  const sharedTickets = await Promise.all(
    rows.map(async (row): Promise<SharedTicketSummary> => {
      const isInvited = row.inviteeIds.includes(userId);
      return {
        sharedTicketId: row.sharedTicketId,
        ticketDate: row.ticketDate,
        title: row.title,
        creatorId: row.creatorId,
        slotCount: row.inviteeIds.length,
        completedCount: row.completedUserIds.length,
        isInvited,
        myStatus: isInvited
          ? row.completedUserIds.includes(userId)
            ? SLOT_STATUS_COMPLETED
            : SLOT_STATUS_EMPTY
          : null,
        // 사진 링크는 열람 권한(그룹 현재 멤버)을 확인한 뒤에만 발급한다
        coverPhotoUrl: row.coverPhotoKey
          ? await createPhotoViewUrl(row.coverPhotoKey)
          : null,
      };
    }),
  );
  return { sharedTickets };
};
