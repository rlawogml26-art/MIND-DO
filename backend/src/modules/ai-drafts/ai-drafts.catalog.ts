import type { DesignCategory, MoodTag } from "@mind-do/shared";

// AI 초안 카탈로그 데이터 (서버 전용)
// 어떤 디자인이 있는지는 디자인 파일(shared/src/designs)이 정한다. 여기에는 AI 프롬프트와
// 디자인 순위 계산에 쓰는 설명·가중치만 둔다.
// 값은 디자인 결정이라 환경변수가 아니라 데이터로 두고, 바꿀 때는 PR로 리뷰한다 (AGENTS.md "AI 초안").

// 카테고리 설명 (AI 프롬프트용). Record 타입이라 shared에 카테고리가 늘면 여기를 채우기 전까지 타입 검사가 실패한다
export const CATEGORY_INFO: Record<DesignCategory, string> = {
  ticket: "티켓: 공연·입장권 같은 정돈된 티켓 모양, 사진을 큼직하게",
  polaroid: "폴라로이드: 흰 테두리의 즉석 사진, 아기자기하고 일상적인 느낌",
  four_cut: "인생네컷: 사진 부스처럼 여러 컷을 나란히, 친구들과 노는 장면",
  film: "필름: 필름 카메라 감성, 차분하고 레트로한 느낌",
};

// 디자인 순위 = 태그 점수 + 색 점수 - 정반대 분위기 감점.
// 태그 하나가 겹칠 때의 점수를 1로 두고, 색 점수(0~1, 대표 색이 사진 색과 가까울수록 1)는 그보다 작게 둬서
// "분위기는 AI가, 색은 보조로" 판단한다 (AGENTS.md "AI 초안" > 색)
export const TAG_MATCH_SCORE = 1;
export const COLOR_SCORE_WEIGHT = 0.8;
export const MOOD_CLASH_PENALTY = 2;

// OKLab 거리가 이 값 이상이면 색 점수 0. 0이면 1
export const COLOR_DISTANCE_MAX = 0.5;

// 색 비교에 쓸 사진 색의 조건. 색의 진함(chroma, 0~100)이 낮으면 회색,
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

// 정반대 분위기 쌍. 사진 분위기와 정반대 태그를 가진 디자인은 순위를 낮춘다
export const MOOD_CLASHES: readonly (readonly [MoodTag, MoodTag])[] = [
  ["차분함", "활기참"],
  ["맑음", "흐림"],
  ["낮", "밤"],
];
