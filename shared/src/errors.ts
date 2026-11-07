// API 에러 코드 (응답의 error.code). 앱은 이 값과 HTTP 상태 코드로 판단하고 message 문구로 판단하지 않는다.
// 이름과 상황은 노션 "API 공통 규칙"의 에러 코드 목록을 따른다. 기존 코드는 이미 쓰고 있으므로 지우거나 이름을 바꾸지 않는다.
export enum ErrorCode {
  // 기존 코드 (변경 금지)
  INVALID_INPUT = "INVALID_INPUT", // 400 입력 형식·길이·개수 위반 (명세의 VALIDATION_ERROR와 같은 뜻)
  TICKET_NOT_FOUND = "TICKET_NOT_FOUND", // 404 개인 티켓이 없거나(삭제 포함) 볼 권한이 없음
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR", // 500

  // 인증 (모든 API 공통, 로그인)
  UNAUTHORIZED = "UNAUTHORIZED", // 401 로그인 안 됨 → 로그인 화면
  ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED", // 401 액세스 토큰 만료 → 토큰 갱신 후 재요청
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS", // 401 이메일 또는 비밀번호 불일치 (둘을 구분하지 않음)
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS", // 409 이미 가입된 이메일

  // 그룹 (생성·초대 링크·가입)
  GROUP_NOT_FOUND = "GROUP_NOT_FOUND", // 404 그룹이 없거나 내가 멤버가 아님
  NOT_GROUP_LEADER = "NOT_GROUP_LEADER", // 403 그룹장 전용 행동
  DEFAULT_GROUP_NOT_ALLOWED = "DEFAULT_GROUP_NOT_ALLOWED", // 403 기본 1인 그룹에서 할 수 없는 행동
  INVITE_INVALID = "INVITE_INVALID", // 404 초대 링크가 없거나 만료·무효 (구분하지 않음)
  GROUP_LIMIT_EXCEEDED = "GROUP_LIMIT_EXCEEDED", // 409 참여 그룹이 이미 4개 (기본 1인 그룹 제외)
  GROUP_FULL = "GROUP_FULL", // 409 그룹 정원 6명 참
  ALREADY_GROUP_MEMBER = "ALREADY_GROUP_MEMBER", // 409 이미 그 그룹 멤버

  // 공동 티켓 (생성·일괄 보기)
  SHARED_TICKET_NOT_FOUND = "SHARED_TICKET_NOT_FOUND", // 404 공동 티켓이 없거나 내 그룹 것이 아님
  INVALID_TICKET_DATE = "INVALID_TICKET_DATE", // 400 미래 날짜 (KST 기준)
  INVALID_INVITEE = "INVALID_INVITEE", // 400 초대자가 그룹의 현재 멤버가 아님
  SHARED_TICKET_DATE_TAKEN = "SHARED_TICKET_DATE_TAKEN", // 409 그 그룹·그 날짜에 공동 티켓이 이미 있음

  // 사진첨부·개인 티켓 저장·AI 초안
  NOT_INVITED = "NOT_INVITED", // 403 공동 티켓의 초대자가 아님
  INVALID_PHOTO_KEY = "INVALID_PHOTO_KEY", // 400 사진 키가 내 슬롯 것이 아니거나 S3에 없음
  INVALID_DESIGN = "INVALID_DESIGN", // 400 디자인이 카탈로그 기준에 맞지 않음
  TICKET_ALREADY_COMPLETED = "TICKET_ALREADY_COMPLETED", // 409 이 슬롯의 개인 티켓을 이미 저장함
  AI_DRAFT_ALREADY_GENERATED = "AI_DRAFT_ALREADY_GENERATED", // 409 이 슬롯에서 이미 초안을 받음 (일반 사용자 1회)
}
