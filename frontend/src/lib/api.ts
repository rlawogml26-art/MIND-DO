import {
  currentUserResponseSchema,
  groupDetailResponseSchema,
  groupListResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  sharedTicketListResponseSchema,
  type LoginRequest,
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

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  init: { method?: string; body?: unknown } = {},
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
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

  if (response.status >= HTTP_SERVER_ERROR_MIN) {
    throw new ApiError(response.status, SERVER_ERROR);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorBodySchema.safeParse(body);
    throw new ApiError(
      response.status,
      error.success ? error.data.error.code : SERVER_ERROR,
    );
  }

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

export const getMe = () => request("/api/users/me", currentUserResponseSchema);

// 그룹
export const getMyGroups = () =>
  request("/api/groups", groupListResponseSchema);

export const getGroupDetail = (groupId: number) =>
  request(`/api/groups/${groupId}`, groupDetailResponseSchema);

// 공동 티켓
export const getGroupSharedTickets = (groupId: number) =>
  request(
    `/api/groups/${groupId}/shared-tickets`,
    sharedTicketListResponseSchema,
  );
