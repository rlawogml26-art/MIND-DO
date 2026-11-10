import type { AiDraftsRequest, AiDraftsResponse } from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  getAccessTokenFromCookieHeader,
  getAuthenticatedUserId,
  UnauthorizedError,
} from "../auth/auth.service.js";
import { aiDraftsConfig } from "./ai-drafts.config.js";
import { generateAiDraftSelection } from "./ai-drafts.bedrock.js";
import { preparePhoto } from "./ai-drafts.image.js";
import {
  checkAiDraftAccess,
  readPhotoObject,
  releaseAiDraft,
  reserveAiDraft,
  verifyPhotoObject,
} from "./ai-drafts.repository.js";
import {
  createFallbackDrafts,
  selectionToDrafts,
} from "./ai-drafts.selection.js";
import type { PreparedPhoto } from "./ai-drafts.image.js";

export { AccessTokenExpiredError, UnauthorizedError };

export class SharedTicketNotFoundError extends Error {}
export class NotInvitedError extends Error {}
export class TicketAlreadyCompletedError extends Error {}
export class InvalidPhotoKeyError extends Error {}
export class AiDraftAlreadyGeneratedError extends Error {}

export function authenticateAiDraftRequester(
  cookieHeader: string | undefined,
): number {
  return getAuthenticatedUserId(getAccessTokenFromCookieHeader(cookieHeader));
}

export async function createAiDrafts(
  userId: number,
  sharedTicketId: number,
  input: AiDraftsRequest,
): Promise<AiDraftsResponse> {
  const startedAt = Date.now();
  const access = await checkAiDraftAccess(sharedTicketId, userId);
  assertAccess(access);

  const prefix = `tickets/${sharedTicketId}/${userId}/`;
  if (input.photoKeys.some((photoKey) => !photoKey.startsWith(prefix))) {
    throw new InvalidPhotoKeyError();
  }

  for (const photoKey of input.photoKeys) {
    if (!(await verifyPhotoObject(photoKey))) throw new InvalidPhotoKeyError();
  }

  if (!(await reserveAiDraft(sharedTicketId, userId))) {
    assertAccess(await checkAiDraftAccess(sharedTicketId, userId));
    throw new AiDraftAlreadyGeneratedError();
  }

  try {
    const preparedPhotos: PreparedPhoto[] = [];
    for (const photoKey of input.photoKeys) {
      const photo = await readPhotoObject(photoKey);
      if (!photo) throw new InvalidPhotoKeyError();
      const prepared = await preparePhoto(photo, aiDraftsConfig);
      preparedPhotos.push(prepared);
    }

    const selection = await generateAiDraftSelection(
      preparedPhotos,
      input.moodPrompt ?? null,
      aiDraftsConfig,
    );
    const response = selection
      ? selectionToDrafts(
          selection,
          preparedPhotos.flatMap((photo) => photo.accentColors),
        )
      : createFallbackDrafts(
          preparedPhotos.flatMap((photo) => photo.accentColors),
        );
    assertAccess(await checkAiDraftAccess(sharedTicketId, userId));
    const source = response.drafts[0]?.source ?? "fallback";
    process.stdout.write(
      `${JSON.stringify({
        event: "AI drafts generated",
        durationMs: Date.now() - startedAt,
        source,
        moodTags: selection?.moodTags ?? [],
      })}\n`,
    );
    return response;
  } catch (error: unknown) {
    try {
      await releaseAiDraft(sharedTicketId, userId);
    } catch (releaseError: unknown) {
      process.stderr.write(
        `${JSON.stringify({
          event: "AI draft reservation rollback failed",
          errorName: getErrorName(releaseError),
        })}\n`,
      );
      throw releaseError;
    }
    throw error;
  }
}

function assertAccess(
  status: Awaited<ReturnType<typeof checkAiDraftAccess>>,
): void {
  if (status === "shared_ticket_not_found") {
    throw new SharedTicketNotFoundError();
  }
  if (status === "not_invited") throw new NotInvitedError();
  if (status === "ticket_already_completed") {
    throw new TicketAlreadyCompletedError();
  }
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
