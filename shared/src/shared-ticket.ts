import { z } from "zod";
import { GROUP_MAX_MEMBERS } from "./groups.js";
import {
  PHOTO_UPLOAD_MAX_COUNT,
  PHOTO_UPLOAD_MIN_COUNT,
} from "./photo-upload.js";
import { ticketDesignSchema } from "./ticket-design.js";

export const JOINT_TITLE_MAX = 12;

export const jointTitleSchema = z.string().trim().max(JOINT_TITLE_MAX);

// 개인 티켓 뒷면 메모 (분위기 프롬프트와 다른 값)
export const PERSONAL_TICKET_MEMO_MAX = 500;
// 생성자 본인은 자동으로 들어가므로 따로 고를 수 있는 초대자는 정원 - 1명
export const SHARED_TICKET_INVITEES_MAX = GROUP_MAX_MEMBERS - 1;

export const SLOT_STATUS_EMPTY = "EMPTY";
export const SLOT_STATUS_COMPLETED = "COMPLETED";

const positiveIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const idParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(positiveIdSchema);

// YYYY-MM-DD이면서 실제로 있는 날짜(2026-02-30 같은 값은 거부)
export const ticketDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  });

// 공백만 있거나 비운 값은 null로 본다 (API 공통 규칙)
const optionalTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

export const sharedTicketIdParamsSchema = z.object({
  sharedTicketId: idParamSchema,
});

export const createSharedTicketRequestSchema = z.object({
  ticketDate: ticketDateSchema,
  title: optionalTrimmedText(JOINT_TITLE_MAX),
  inviteeIds: z
    .array(positiveIdSchema)
    .max(SHARED_TICKET_INVITEES_MAX)
    .refine((ids) => new Set(ids).size === ids.length),
});

// design은 여기서 검사하지 않는다. 형식이 틀리면 INVALID_INPUT이 아니라 INVALID_DESIGN으로 알려야 해서
// 서버가 ticketDesignSchema로 따로 검사한다.
export const issueTicketRequestSchema = z.object({
  photoKeys: z
    .array(z.string().min(1))
    .min(PHOTO_UPLOAD_MIN_COUNT)
    .max(PHOTO_UPLOAD_MAX_COUNT)
    .refine((keys) => new Set(keys).size === keys.length),
  memo: optionalTrimmedText(PERSONAL_TICKET_MEMO_MAX),
  design: z.unknown(),
});

export const ticketPhotoResponseSchema = z.object({
  url: z.url(),
  sortOrder: z.number().int().positive(),
});

export const issuedTicketResponseSchema = z.object({
  ticketId: z.number().int().positive(),
  sharedTicketId: z.number().int().positive(),
  status: z.literal(SLOT_STATUS_COMPLETED),
  photos: z.array(ticketPhotoResponseSchema),
  memo: z.string().nullable(),
  design: ticketDesignSchema,
  createdAt: z.iso.datetime(),
});

export const sharedTicketSlotResponseSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string(),
  status: z.enum([SLOT_STATUS_EMPTY, SLOT_STATUS_COMPLETED]),
  isCurrentMember: z.boolean(),
  ticket: z
    .object({
      ticketId: z.number().int().positive(),
      photos: z.array(ticketPhotoResponseSchema),
      memo: z.string().nullable(),
      // 저장된 디자인이 지금 형식과 맞지 않으면(디자인 형식이 바뀐 뒤의 예전 티켓) null.
      // 티켓 하나 때문에 공동 티켓 전체 조회가 실패하지 않게 한다
      design: ticketDesignSchema.nullable(),
      createdAt: z.iso.datetime(),
    })
    .nullable(),
});

export const sharedTicketDetailResponseSchema = z.object({
  sharedTicketId: z.number().int().positive(),
  groupId: z.number().int().positive(),
  groupName: z.string(),
  ticketDate: ticketDateSchema,
  title: z.string().nullable(),
  creatorId: z.number().int().positive(),
  canEdit: z.boolean(),
  createdAt: z.iso.datetime(),
  slots: z.array(sharedTicketSlotResponseSchema),
});

export type CreateSharedTicketRequest = z.infer<
  typeof createSharedTicketRequestSchema
>;
export type IssueTicketRequest = z.infer<typeof issueTicketRequestSchema>;
export type IssuedTicketResponse = z.infer<typeof issuedTicketResponseSchema>;
export type SharedTicketDetailResponse = z.infer<
  typeof sharedTicketDetailResponseSchema
>;

// 공동 티켓 목록 조회 (GET /api/groups/{groupId}/shared-tickets)
// month: 이 달만 (YYYY-MM). 없으면 전체
export const sharedTicketListQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export const sharedTicketSummarySchema = z.object({
  sharedTicketId: positiveIdSchema,
  ticketDate: ticketDateSchema,
  title: z.string().nullable(),
  creatorId: positiveIdSchema,
  // 슬롯 수(= 초대자 수) / 개인 티켓을 저장한 수
  slotCount: z.number().int().min(0).max(GROUP_MAX_MEMBERS),
  completedCount: z.number().int().min(0).max(GROUP_MAX_MEMBERS),
  isInvited: z.boolean(),
  // 내 슬롯 상태. 초대자가 아니면 null
  myStatus: z.enum([SLOT_STATUS_EMPTY, SLOT_STATUS_COMPLETED]).nullable(),
  // 가장 먼저 저장된 개인 티켓의 대표 사진(1번). 없으면 null
  coverPhotoUrl: z.url().nullable(),
});

export const sharedTicketListResponseSchema = z.object({
  sharedTickets: z.array(sharedTicketSummarySchema),
});

export type SharedTicketListQuery = z.infer<typeof sharedTicketListQuerySchema>;
export type SharedTicketSummary = z.infer<typeof sharedTicketSummarySchema>;
export type SharedTicketListResponse = z.infer<
  typeof sharedTicketListResponseSchema
>;
