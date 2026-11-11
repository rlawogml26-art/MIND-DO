import type { CompositeTemplateId, MoodTag, PaletteId } from "@mind-do/shared";

// AI 초안 카탈로그 데이터 (서버 전용)
// ID 목록은 shared에 있고, 여기에는 AI 프롬프트와 색 계산에 쓰는 설명·규칙만 둔다.
// Record<ID, ...> 타입이라 shared에 ID가 추가되면 여기를 채우기 전까지 타입 검사가 실패한다.
// 값은 디자인 결정이라 환경변수가 아니라 데이터로 두고, 바꿀 때는 PR로 리뷰한다 (AGENTS.md "AI 초안").

// 사진 합성 템플릿 (PM 시안의 세 스타일)
export const TEMPLATE_INFO: Record<
  CompositeTemplateId,
  { name: string; description: string }
> = {
  blend: {
    name: "자연스러운 장면",
    description: "사진들의 색감을 이어 자연스럽게 한 장면처럼 합성",
  },
  collage: {
    name: "감각적인 조합",
    description: "사진의 주요 장면을 자유롭게 겹쳐 배치",
  },
  light: {
    name: "광원·색감·질감",
    description: "빛과 색, 질감으로 분위기를 강조",
  },
};

// 팔레트 규칙: 실제 색 = 사진의 주요 색상(hue) + 이 규칙의 선명도·밝기
// hueAnchor가 있으면 사진 색상이 anchorRange도 안에 있을 때만 그 방향으로 anchorWeight만큼 당기고,
// 너무 멀면(예: warm인데 파란 사진) 반대 색과 섞여 엉뚱한 색이 되므로 hueAnchor를 그대로 쓴다.
// 사진에서 쓸 만한 색이 없으면(거의 회색·검정·흰색) defaultColor를 쓴다.
// 처음 값은 PM 시안 색에 맞춰 잡은 것이고, 화면을 보며 조정한다.
export type PaletteRule = {
  name: string;
  tags: readonly MoodTag[]; // 이 팔레트가 어울리는 분위기 (AI 프롬프트용)
  hueAnchor: number | null; // 0~360
  anchorRange: number; // 사진 색상과 hueAnchor의 거리(도)가 이 안이면 섞음
  anchorWeight: number; // 0~1
  saturation: number; // 0~100
  lightness: number; // 0~100
  defaultColor: string; // #RRGGBB
};

export const PALETTE_RULES: Record<PaletteId, PaletteRule> = {
  warm: {
    name: "따뜻한 노을",
    tags: ["따뜻함", "맑음", "낮", "여행", "음식"],
    hueAnchor: 30,
    anchorRange: 60,
    anchorWeight: 0.5,
    saturation: 60,
    lightness: 52,
    defaultColor: "#C9773F",
  },
  cool: {
    name: "차분한 푸른빛",
    tags: ["차분함", "흐림", "자연", "감성"],
    hueAnchor: 210,
    anchorRange: 60,
    anchorWeight: 0.5,
    saturation: 35,
    lightness: 45,
    defaultColor: "#4F6F8F",
  },
  night: {
    name: "밤의 조명",
    tags: ["밤", "공연", "활기참"],
    hueAnchor: null,
    anchorRange: 0,
    anchorWeight: 0,
    saturation: 45,
    lightness: 18,
    defaultColor: "#1F2A4A",
  },
  pastel: {
    name: "파스텔",
    tags: ["귀여움", "생일", "설렘", "데이트"],
    hueAnchor: null,
    anchorRange: 0,
    anchorWeight: 0,
    saturation: 55,
    lightness: 82,
    defaultColor: "#F2C4D4",
  },
  vivid: {
    name: "선명한 색",
    tags: ["활기참", "축하", "모임", "여행"],
    hueAnchor: null,
    anchorRange: 0,
    anchorWeight: 0,
    saturation: 72,
    lightness: 50,
    defaultColor: "#D9482B",
  },
  mono: {
    name: "빈티지 흑백",
    tags: ["레트로", "차분함", "감성"],
    hueAnchor: null,
    anchorRange: 0,
    anchorWeight: 0,
    saturation: 8,
    lightness: 38,
    defaultColor: "#615A55",
  },
};

// 배경색 후보로 쓸 사진 색의 조건. 색의 진함(chroma, 0~100)이 낮으면 회색,
// 밝기(0~100)가 너무 낮거나 높으면 검정·흰색으로 보고 쓰지 않는다
export const PHOTO_COLOR_MIN_CHROMA = 15;
export const PHOTO_COLOR_MIN_LIGHTNESS = 15;
export const PHOTO_COLOR_MAX_LIGHTNESS = 90;

// 분위기 태그 뜻풀이 (AI 프롬프트용). 테스트에서 "공부·조용함"을 "자연"으로 읽은 문제를 줄이려고 둔다.
export const MOOD_TAG_INFO: Record<MoodTag, string> = {
  따뜻함: "포근하고 정겨운 느낌, 노을·햇살·따뜻한 빛",
  밤: "해가 진 뒤, 어두운 하늘이나 조명",
  낮: "해가 떠 있는 밝은 시간",
  맑음: "맑은 하늘, 화창한 날씨",
  흐림: "흐리거나 비 오는 날씨",
  레트로: "옛날 느낌, 필름·빈티지 감성",
  귀여움: "아기자기하고 사랑스러운 느낌",
  여행: "여행지, 낯선 곳을 다니는 상황",
  생일: "생일 파티, 케이크·초",
  차분함: "조용하고 잔잔한 느낌. 공부·독서·휴식·혼자 쉬는 날도 여기",
  활기참: "신나고 시끌벅적한 느낌, 많이 웃고 움직이는 상황",
  자연: "숲·산·바다·꽃·공원 같은 자연 풍경이 보일 때만. 조용한 실내는 자연이 아님",
  음식: "음식이 중심인 상황, 맛집·요리·카페",
  공연: "공연·노래·콘서트·노래방",
  데이트: "연인과 함께하는 시간",
  설렘: "두근거리고 기대되는 느낌",
  축하: "졸업·합격·기념일 같은 축하할 일",
  모임: "여러 사람이 함께 모인 자리",
  감성: "잔잔하게 마음에 남는 분위기",
};

// 정반대 분위기 쌍. 프롬프트 분위기와 정반대인 테마는 쓰지 않는다 (프롬프트가 있을 때만 적용)
export const MOOD_CLASHES: readonly (readonly [MoodTag, MoodTag])[] = [
  ["차분함", "활기참"],
  ["맑음", "흐림"],
  ["낮", "밤"],
];
