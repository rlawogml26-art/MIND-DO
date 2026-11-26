import {
  ErrorCode,
  createGroupInviteResponseSchema,
  createGroupRequestSchema,
  createSharedTicketRequestSchema,
  currentUserResponseSchema,
  groupResponseSchema,
  inviteInfoResponseSchema,
  joinGroupResponseSchema,
  signupRequestSchema,
  signupResponseSchema,
  groupDetailResponseSchema,
  groupListResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  sharedTicketListResponseSchema,
  sharedTicketDetailResponseSchema,
  sharedTicketPhotoUploadUrlsResponseSchema,
  aiDraftsResponseSchema,
  issuedTicketResponseSchema,
  myTicketListResponseSchema,
  type CreateGroupRequest,
  type CreateSharedTicketRequest,
  type LoginRequest,
  type SignupRequest,
  type SharedTicketPhotoUploadRequest,
  type AiDraftsRequest,
  type TicketDecoration,
  type TicketDesign,
} from "@mind-do/shared";
import { z } from "zod";

// 앱의 공통 서버 호출 코드 (AGENTS.md "보안")
// - 로그인 토큰은 서버가 httpOnly 쿠키로 주고받는다. 앱은 토큰을 읽거나 저장하지 않는다
//   (React Native는 응답의 쿠키를 기기에 보관하고 같은 서버로 보낼 때 자동으로 실어 보낸다)
// - 응답은 { data } 또는 { error: { code, message } }. 앱은 error.code와 상태 코드로 판단하고 message로 판단하지 않는다
// - 500번대(ALB의 502·503·504 포함)는 응답 모양을 가정하지 않는다
// - 서버 주소는 EXPO_PUBLIC_API_BASE_URL에서 읽는다 (비밀값이 아님. 비밀값은 앱에 넣지 않는다)

// 서버가 응답하지 못했을 때(연결 실패, 500번대) 앱에서만 쓰는 코드
export const NETWORK_ERROR = "NETWORK_ERROR";
export const SERVER_ERROR = "SERVER_ERROR";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

const HTTP_SERVER_ERROR_MIN = 500;

function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.");
  }
  return url.replace(/\/+$/, "");
}

// 응답의 겉모양 ({ data } / { error: { code } }). 안의 data는 API마다 shared 스키마로 따로 검사한다
const errorBodySchema = z.object({ error: z.object({ code: z.string() }) });
const dataBodySchema = z.object({ data: z.unknown() });

type RequestInit = { method?: string; body?: unknown };

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      headers:
        init.body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
}

// 토큰 갱신은 한 번에 하나만 보낸다 (AGENTS.md "로그인 토큰").
// 동시에 두 번 갱신하면 두 번째 요청이 이미 바뀐 토큰을 들고 가서 서버가 탈취로 보고 로그아웃시킨다.
// 갱신 중에 만료를 만난 다른 요청은 같은 갱신이 끝나기를 기다렸다가 다시 보낸다
let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = send("/api/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function readErrorCode(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const error = errorBodySchema.safeParse(body);
  return error.success ? error.data.error.code : SERVER_ERROR;
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<z.infer<S>> {
  let response = await send(path, init);

  // 액세스 토큰이 만료됐으면 갱신 후 한 번만 다시 보낸다. 갱신도 실패하면 로그인 화면으로 보내도록
  // INVALID_REFRESH_TOKEN을 던진다
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    const code = await readErrorCode(response.clone());
    if (code === ErrorCode.ACCESS_TOKEN_EXPIRED) {
      if (!(await refreshOnce())) {
        throw new ApiError(401, ErrorCode.INVALID_REFRESH_TOKEN);
      }
      response = await send(path, init);
    }
  }

  if (response.status >= HTTP_SERVER_ERROR_MIN) {
    throw new ApiError(response.status, SERVER_ERROR);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorCode(response));
  }

  const body: unknown = await response.json().catch(() => null);
  const parsed = schema.safeParse(dataBodySchema.safeParse(body).data?.data);
  if (!parsed.success) throw new ApiError(response.status, SERVER_ERROR);
  return parsed.data;
}

// 인증
export const login = (input: LoginRequest) =>
  request("/api/auth/login", loginResponseSchema, {
    method: "POST",
    body: loginRequestSchema.parse(input),
  });

// 회원가입 성공 시 서버가 로그인 쿠키까지 내려준다 (가입 즉시 로그인)
export const signup = (input: SignupRequest) =>
  request("/api/auth/signup", signupResponseSchema, {
    method: "POST",
    body: signupRequestSchema.parse(input),
  });

// 서버 응답과 관계없이 앱은 로그인 화면으로 보낸다 (노션 명세 "로그아웃")
export const logout = () =>
  request("/api/auth/logout", z.object({}), { method: "POST" });

export const getMe = () => request("/api/users/me", currentUserResponseSchema);
export const getMyTickets = () =>
  request("/api/users/me/tickets", myTicketListResponseSchema);

// 그룹
export const getMyGroups = () =>
  request("/api/groups", groupListResponseSchema);

export const getGroupDetail = (groupId: number) =>
  request(`/api/groups/${groupId}`, groupDetailResponseSchema);

export const createGroup = (input: CreateGroupRequest) =>
  request("/api/groups", groupResponseSchema, {
    method: "POST",
    body: createGroupRequestSchema.parse(input),
  });

// 초대 링크 만들기. 응답의 링크 주소는 이때 한 번만 받으므로 화면이 바로 복사·공유한다
export const createGroupInvite = (groupId: number) =>
  request(`/api/groups/${groupId}/invites`, createGroupInviteResponseSchema, {
    method: "POST",
  });

// 초대 토큰은 링크 주소의 마지막 부분. 앱 안에서 붙여넣은 링크에서 꺼내 넘긴다
export const getInvite = (token: string) =>
  request(
    `/api/invites/${encodeURIComponent(token)}`,
    inviteInfoResponseSchema,
  );

export const joinGroupByInvite = (token: string) =>
  request(
    `/api/invites/${encodeURIComponent(token)}/join`,
    joinGroupResponseSchema,
    { method: "POST" },
  );

// 공동 티켓
export const getGroupSharedTickets = (groupId: number, month?: string) =>
  request(
    `/api/groups/${groupId}/shared-tickets${month ? `?month=${encodeURIComponent(month)}` : ""}`,
    sharedTicketListResponseSchema,
  );

export const createSharedTicket = (
  groupId: number,
  input: CreateSharedTicketRequest,
) =>
  request(
    `/api/groups/${groupId}/shared-tickets`,
    sharedTicketDetailResponseSchema,
    { method: "POST", body: createSharedTicketRequestSchema.parse(input) },
  );

export const getSharedTicketDetail = (sharedTicketId: number) =>
  request(
    `/api/shared-tickets/${sharedTicketId}`,
    sharedTicketDetailResponseSchema,
  );

// 개인 티켓 만들기 (사진 올리기 → AI 초안 → 저장)

export const getPhotoUploadUrls = (
  sharedTicketId: number,
  input: SharedTicketPhotoUploadRequest,
) =>
  request(
    `/api/shared-tickets/${sharedTicketId}/photos/upload-urls`,
    sharedTicketPhotoUploadUrlsResponseSchema,
    { method: "POST", body: input },
  );

export const createAiDrafts = (
  sharedTicketId: number,
  input: AiDraftsRequest,
) =>
  request(
    `/api/shared-tickets/${sharedTicketId}/ai-drafts`,
    aiDraftsResponseSchema,
    {
      method: "POST",
      body: input,
    },
  );

export const issueTicket = (
  sharedTicketId: number,
  input: {
    photoKeys: string[];
    memo?: string;
    design: TicketDesign;
    decorations?: TicketDecoration[];
  },
) =>
  request(
    `/api/shared-tickets/${sharedTicketId}/tickets`,
    issuedTicketResponseSchema,
    {
      method: "POST",
      body: input,
    },
  );
