import type { CompositeTemplateId } from "@mind-do/shared";

// 템플릿별 사진 칸 좌표 (미소 님 시안, 개인 티켓 800×400 = 2:1 기준)
// x·w는 티켓 너비 대비 %, y·h는 티켓 높이 대비 %, rotate는 칸 가운데 기준 도(양수 = 시계 방향).
// 사진 수(1~4)마다 칸 목록이 다르고, 배열 순서가 사진 번호(1번이 대표 사진)다.
export type PhotoSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
};

type SlotsByCount = Record<1 | 2 | 3 | 4, PhotoSlot[]>;

// 사진 수에 맞는 칸 목록. 0장이면 빈 목록, 4장을 넘으면 앞의 4장 기준
export function slotsFor(
  templateId: CompositeTemplateId,
  photoCount: number,
): PhotoSlot[] {
  const byCount = TEMPLATE_SLOTS[templateId];
  if (photoCount <= 0) return [];
  if (photoCount === 1) return byCount[1];
  if (photoCount === 2) return byCount[2];
  if (photoCount === 3) return byCount[3];
  return byCount[4];
}

const slot = (x: number, y: number, w: number, h: number): PhotoSlot => ({
  x,
  y,
  w,
  h,
  rotate: 0,
});

export const TEMPLATE_SLOTS: Record<CompositeTemplateId, SlotsByCount> = {
  blend_fade: {
    1: [slot(6.25, 5, 87.5, 90)],
    2: [slot(6.25, 5, 62.5, 90), slot(68.75, 5, 25, 90)],
    3: [
      slot(6.25, 5, 37.5, 90),
      slot(43.75, 5, 25, 90),
      slot(68.75, 5, 25, 90),
    ],
    4: [
      slot(6.25, 5, 30, 90),
      slot(36.25, 5, 25, 90),
      slot(61.25, 5, 22.5, 90),
      slot(83.75, 5, 10, 90),
    ],
  },
  collage_grid: {
    1: [slot(6.25, 5, 87.5, 90)],
    2: [slot(6.25, 5, 60, 90), slot(66.25, 5, 27.5, 90)],
    3: [
      slot(6.25, 5, 50, 90),
      slot(56.25, 5, 37.5, 45),
      slot(56.25, 50, 37.5, 45),
    ],
    4: [
      slot(6.25, 5, 58.375, 52),
      slot(64.625, 5, 29.125, 52),
      slot(6.375, 57, 31.75, 38),
      slot(38.125, 57, 55.625, 38),
    ],
  },
  light_basic: {
    1: [slot(6.25, 5, 87.5, 90)],
    2: [slot(6.25, 5, 60, 90), slot(66.625, 5, 27.125, 90)],
    3: [
      slot(6.25, 7.5, 40.125, 85),
      slot(46.375, 7.5, 26.25, 85),
      slot(72.625, 7.5, 21.125, 85),
    ],
    4: [
      slot(6.25, 5, 31.25, 90),
      slot(37.5, 5, 18.75, 90),
      slot(56.25, 5, 18.75, 90),
      slot(75, 5, 18.75, 90),
    ],
  },
};

// light_basic 빛 (시안: 사진 영역 하단 중앙에서 위로 번지는 타원, #FBC100, 60% → 10%)
export const LIGHT_COLOR = "#FBC100";
export const LIGHT_CENTER_OPACITY = 0.6;
export const LIGHT_EDGE_OPACITY = 0.1;

export const TICKET_ASPECT = 2; // 개인 티켓 너비 : 높이

// 디자인이 없을 때(예전 형식 티켓 등) 쓰는 기본값
export const FALLBACK_TEMPLATE: CompositeTemplateId = "collage_grid";
export const FALLBACK_BACKGROUND = "#E8CBC2";
