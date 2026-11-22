// 티켓 디자인 파일 형식의 고정 값 (AGENTS.md "티켓 디자인").
// 앱·서버·피그마 플러그인이 같은 값을 써야 해서 여기 한 곳에만 둔다.

// 카테고리 (임시값 4개, 11/16). 늘리면 여기와 디자인 폴더를 같이 추가한다
export const DESIGN_CATEGORIES = [
  "ticket",
  "polaroid",
  "four_cut",
  "film",
] as const;

// 피그마 페이지 이름 → 카테고리 (플러그인이 페이지 이름으로 카테고리를 채운다)
export const DESIGN_CATEGORY_PAGE_NAMES: Record<
  (typeof DESIGN_CATEGORIES)[number],
  string
> = {
  ticket: "티켓",
  polaroid: "폴라로이드",
  four_cut: "인생네컷",
  film: "필름",
};

// 방향 (11/18). 티켓 한 장 = 공동 쪽 + 개인 쪽 (2.5:1).
// 세로형은 위 1600이 개인 쪽, 아래 400이 공동 쪽이다
export const DESIGN_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type DesignOrientation = (typeof DESIGN_ORIENTATIONS)[number];

type LayoutRect = { x: number; y: number; w: number; h: number };
// 방향별 배치: 티켓 전체 크기, 그 안의 공동 쪽·개인 쪽 자리, 절취선 양 끝의 홈 가운데.
// 디자인 파일의 칸 좌표는 공동 쪽·개인 쪽 각자의 왼쪽 위가 기준이다
export const DESIGN_LAYOUTS: Record<
  DesignOrientation,
  {
    ticket: { w: number; h: number };
    stub: LayoutRect;
    body: LayoutRect;
    notches: [{ x: number; y: number }, { x: number; y: number }];
  }
> = {
  horizontal: {
    ticket: { w: 2000, h: 800 },
    stub: { x: 0, y: 0, w: 400, h: 800 },
    body: { x: 400, y: 0, w: 1600, h: 800 },
    notches: [
      { x: 400, y: 0 },
      { x: 400, y: 800 },
    ],
  },
  vertical: {
    ticket: { w: 800, h: 2000 },
    stub: { x: 0, y: 1600, w: 800, h: 400 },
    body: { x: 0, y: 0, w: 800, h: 1600 },
    notches: [
      { x: 0, y: 1600 },
      { x: 800, y: 1600 },
    ],
  },
};

// 사진 수별 판
export const DESIGN_PHOTO_COUNTS = ["1", "2", "3", "4"] as const;

// 앱에 들어 있는 글꼴 (임시값, 11/16). 피그마 글꼴 이름 → 형식의 글꼴 id
export const DESIGN_FONTS = {
  sans: "Noto Sans KR",
  serif: "Noto Serif KR",
  script: "Nanum Pen Script",
  display: "Black Han Sans",
} as const;
export const DESIGN_FONT_IDS = Object.keys(DESIGN_FONTS) as [
  keyof typeof DESIGN_FONTS,
  ...(keyof typeof DESIGN_FONTS)[],
];

// 글자 칸에 넣는 값. static이면 디자인에 적힌 고정 문구.
// participants는 공동 티켓 초대자 이름 목록 (초대자를 고르면 자동으로 채워짐)
export const DESIGN_TEXT_BINDS = [
  "title",
  "date",
  "groupName",
  "participants",
  "static",
] as const;

// 공동 쪽에 꼭 있어야 하는 글자 칸 수 (요구사항: 공동 필수 정보는 날짜·그룹명·참여자, 제목은 선택)
export const DESIGN_STUB_TEXT_COUNTS: Record<
  Exclude<(typeof DESIGN_TEXT_BINDS)[number], "static">,
  { min: number; max: number }
> = {
  date: { min: 1, max: 1 },
  groupName: { min: 1, max: 1 },
  participants: { min: 1, max: 1 },
  title: { min: 0, max: 1 },
};

export const DESIGN_PHOTO_SHAPES = ["rect", "ellipse", "polygon"] as const;
