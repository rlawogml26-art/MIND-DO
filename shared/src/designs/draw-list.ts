import {
  DESIGN_BODY_SIZE,
  DESIGN_PHOTO_COUNTS,
  DESIGN_STUB_SIZE,
  DESIGN_TICKET_SIZE,
} from "./constants.js";
import type { DesignFile, DesignPhotoSlot, DesignText } from "./schema.js";

// 디자인 파일을 "무엇을 어디에 어떤 순서로 그릴지" 목록으로 바꾼다 (AGENTS.md "티켓 디자인").
// 앱 렌더러와 피그마 플러그인 미리보기가 이 목록대로 칠하기만 하도록, 판단은 여기 한 곳에만 둔다.
// 다른 라이브러리를 쓰지 않는 순수 계산으로 유지한다.

// 공동 티켓에서 오는 글자 값 (글자 모양은 디자인 파일이 정한다)
export type TicketTextValues = {
  title?: string | null;
  // YYYY-MM-DD
  date: string;
  groupName: string;
  participants: string[];
};

export type DrawImage = {
  kind: "image";
  // 디자인 폴더 안의 그림 파일 이름 (stub.png 등). 실제 그림은 앱·플러그인이 찾는다
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DrawPhoto = {
  kind: "photo";
  // 사용자가 올린 사진 순서 (0 = 대표 사진)
  photoIndex: number;
  slot: DesignPhotoSlot;
};

export type DrawText = {
  kind: "text";
  text: string;
  style: Omit<DesignText, "bind" | "value" | "fallback">;
};

export type DrawOp = DrawImage | DrawPhoto | DrawText;

export type DrawList = {
  // 티켓 한 장의 캔버스 (px). 렌더러는 화면 크기에 맞춰 줄여 그린다
  width: number;
  height: number;
  // 바깥 모양: 둥근 모서리 + 절취선 위아래의 반원 홈 (홈 가운데 x = 공동 쪽 오른쪽 끝)
  cornerRadius: number;
  notchRadius: number;
  notchX: number;
  ops: DrawOp[];
};

export function formatTicketDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : date;
}

export const PARTICIPANT_SEPARATOR = " · ";

function textFor(t: DesignText, values: TicketTextValues): string {
  const raw = (() => {
    switch (t.bind) {
      case "static":
        return t.value ?? "";
      case "title":
        return values.title ?? "";
      case "date":
        return formatTicketDate(values.date);
      case "groupName":
        return values.groupName;
      case "participants":
        return values.participants.join(PARTICIPANT_SEPARATOR);
    }
  })().trim();
  return raw || (t.fallback ?? "").trim();
}

function textOps(
  texts: DesignText[],
  values: TicketTextValues,
  offsetX: number,
): DrawText[] {
  const ops: DrawText[] = [];
  for (const t of texts) {
    const text = textFor(t, values);
    if (!text) continue;
    ops.push({
      kind: "text",
      text,
      style: {
        x: t.x + offsetX,
        y: t.y,
        w: t.w,
        h: t.h,
        font: t.font,
        size: t.size,
        weight: t.weight,
        color: t.color,
        align: t.align,
        rotate: t.rotate,
        maxLines: t.maxLines,
        letterSpacing: t.letterSpacing,
        stroke: t.stroke,
        shadow: t.shadow,
      },
    });
  }
  return ops;
}

// 사진 수는 1~4로 맞춘다 (사진이 4장보다 많으면 앞의 4장만 쓴다)
export function photoVariantKey(
  photoCount: number,
): (typeof DESIGN_PHOTO_COUNTS)[number] {
  const n = Math.min(Math.max(Math.trunc(photoCount), 1), 4);
  return DESIGN_PHOTO_COUNTS[n - 1] ?? "1";
}

export function buildDrawList(
  design: DesignFile,
  photoCount: number,
  values: TicketTextValues,
): DrawList {
  const bodyX = DESIGN_STUB_SIZE.w;
  const variant = design.body[photoVariantKey(photoCount)];

  const ops: DrawOp[] = [];
  // 1. 아래 그림: 공동 쪽 그림 + 개인 쪽 아래 그림
  ops.push({
    kind: "image",
    file: design.stub.image,
    x: 0,
    y: 0,
    ...DESIGN_STUB_SIZE,
  });
  ops.push({
    kind: "image",
    file: variant.under,
    x: bodyX,
    y: 0,
    ...DESIGN_BODY_SIZE,
  });
  // 2. 사진: 겹치면 1번(대표) 사진이 맨 위에 오도록 뒤 번호부터 그린다
  variant.photos
    .map((slot, photoIndex) => ({
      slot: { ...slot, x: slot.x + bodyX },
      photoIndex,
    }))
    .reverse()
    .forEach(({ slot, photoIndex }) =>
      ops.push({ kind: "photo", photoIndex, slot }),
    );
  // 3. 위 그림
  if (variant.over) {
    ops.push({
      kind: "image",
      file: variant.over,
      x: bodyX,
      y: 0,
      ...DESIGN_BODY_SIZE,
    });
  }
  // 4. 글자
  ops.push(...textOps(design.stub.texts, values, 0));
  ops.push(...textOps(variant.texts, values, bodyX));

  return {
    width: DESIGN_TICKET_SIZE.w,
    height: DESIGN_TICKET_SIZE.h,
    cornerRadius: design.shape.cornerRadius,
    notchRadius: design.shape.notchRadius,
    notchX: bodyX,
    ops,
  };
}
