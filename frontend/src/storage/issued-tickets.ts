import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createTicketSchema,
  TICKET_TITLE_MAX,
  TICKET_LOCATION_MAX,
} from "@mind-do/shared";
import { z } from "zod";

// 후속 Issue #24: 기기 임시 보관을 확정된 저장·업로드 방식으로 교체한다.
const ISSUED_TICKETS_KEY = "@memore/issued_tickets_by_date_v1";

export const normalizeTicketDate = (visitDate: string) =>
  createTicketSchema.shape.visitDate.parse(visitDate.replaceAll(".", "-"));

export const localPhotoSchema = z
  .string()
  .refine((uri) =>
    /^(file:|content:|ph:|assets-library:|blob:|data:image\/)/.test(uri),
  );

export const placedStickerSchema = z.object({
  id: z.number().int().nonnegative(),
  symbol: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const issuedTicketSchema = z.object({
  visitDate: z.string().transform(normalizeTicketDate),
  front: localPhotoSchema.nullable(),
  backs: z.array(localPhotoSchema),
  frame: z.number().int().nonnegative(),
  placedStickers: z.array(placedStickerSchema),
  caption: z.string(),
  sticker: z.string(),
  ticketFont: z.enum(["sans-serif", "serif", "monospace"]),
  title: createTicketSchema.shape.title,
  location: createTicketSchema.shape.location,
  backStyle: z.number().int().nonnegative(),
  memo: createTicketSchema.shape.memo,
  backColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  issuedAt: z.iso.datetime(),
});

export type IssuedTicket = z.infer<typeof issuedTicketSchema>;

// Normalize legacy field names only when reading existing device data.
export function normalizeStoredTicketFields(value: unknown): unknown {
  const result = z.record(z.string(), z.unknown()).safeParse(value);
  if (!result.success) return value;
  const fields = result.data;
  return {
    ...fields,
    title: fields.title ?? fields.ticketTitle,
    location: fields.location ?? fields.ticketPlace,
    memo: fields.memo ?? fields.backText,
    visitDate: fields.visitDate ?? fields.ticketDate ?? fields.date,
  };
}

export async function listIssuedTickets(): Promise<IssuedTicket[]> {
  const raw = await AsyncStorage.getItem(ISSUED_TICKETS_KEY);
  if (!raw) return [];
  const entries = z
    .record(
      z.string(),
      z.preprocess(normalizeStoredTicketFields, issuedTicketSchema),
    )
    .parse(JSON.parse(raw));
  return Object.values(entries).sort((a, b) =>
    b.visitDate.localeCompare(a.visitDate),
  );
}

export async function getIssuedTicket(
  visitDate: string,
): Promise<IssuedTicket | null> {
  const normalizedVisitDate = normalizeTicketDate(visitDate);
  return (
    (await listIssuedTickets()).find(
      (ticket) => ticket.visitDate === normalizedVisitDate,
    ) ?? null
  );
}

let pendingWrite: Promise<unknown> = Promise.resolve();

// 후속 Issue #25: 원본의 날짜당 1개 동작을 확정된 발권 정책으로 교체한다.
export function issueTicketOnce(ticket: IssuedTicket): Promise<boolean> {
  const write = pendingWrite.then(async () => {
    const validated = issuedTicketSchema.parse(ticket);
    const tickets = await listIssuedTickets();
    if (tickets.some((item) => item.visitDate === validated.visitDate))
      return false;
    const entries = Object.fromEntries(
      tickets.map((item) => [item.visitDate, item]),
    );
    entries[validated.visitDate] = validated;
    await AsyncStorage.setItem(ISSUED_TICKETS_KEY, JSON.stringify(entries));
    return true;
  });
  // 실패한 저장이 이후의 재시도를 막지 않게 한다.
  pendingWrite = write.catch(() => undefined);
  return write;
}

// 후속 Issue #24: 임시저장과 사진 URI 보관을 확정된 저장 방식으로 교체한다.
const DRAFT_KEY = "@memore/front_ticket_draft_v1";
const frontDraftSchema = (frameCount: number) =>
  z.object({
    front: localPhotoSchema.nullable(),
    frame: z
      .number()
      .int()
      .min(0)
      .max(frameCount - 1),
    frameChosen: z.boolean(),
    sticker: z.string(),
    placedStickers: z.array(placedStickerSchema),
    caption: z.string(),
    ticketFont: z.enum(["sans-serif", "serif", "monospace"]),
    title: z.string().max(TICKET_TITLE_MAX),
    visitDate: z.string(),
    location: z.string().max(TICKET_LOCATION_MAX),
    savedAt: z.iso.datetime(),
  });

export type FrontDraft = z.infer<ReturnType<typeof frontDraftSchema>>;

export async function loadFrontDraft(
  frameCount: number,
): Promise<FrontDraft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return frontDraftSchema(frameCount).parse(
    normalizeStoredTicketFields(JSON.parse(raw)),
  );
}

export async function saveFrontDraft(
  draft: FrontDraft,
  frameCount: number,
): Promise<FrontDraft> {
  const validated = frontDraftSchema(frameCount).parse(draft);
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(validated));
  return validated;
}
