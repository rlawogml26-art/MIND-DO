import { DESIGN_TEXT_BINDS } from "@mind-do/shared";

// 피그마 레이어 이름 규칙 (README 참고)
//   photo-1 ~ photo-4         사진 자리
//   text:title / text:date / text:groupName / text:participants / text:static   글자 자리
//   text:title fallback="우리의 하루"   빈 값일 때 대신 쓸 문구
//   guide:...                 안내용. 내보낼 때 빠짐
//   그 밖의 이름              그림(배경·장식)으로 구워짐

export type TextBind = (typeof DESIGN_TEXT_BINDS)[number];

export type ParsedName =
  | { kind: "photo"; index: number }
  | { kind: "text"; bind: TextBind; fallback?: string }
  | { kind: "guide" }
  | { kind: "suspicious"; reason: string }
  | { kind: "art" };

const isBind = (v: string): v is TextBind =>
  (DESIGN_TEXT_BINDS as readonly string[]).includes(v);

export function parseLayerName(raw: string): ParsedName {
  const name = raw.trim();
  if (/^guide:/i.test(name)) return { kind: "guide" };

  const photo = /^photo-(\d+)$/.exec(name);
  if (photo) return { kind: "photo", index: Number(photo[1]) };

  const text = /^text:(\w+)(.*)$/.exec(name);
  if (text) {
    const bind = text[1];
    if (!isBind(bind)) {
      return {
        kind: "suspicious",
        reason: `"${bind}"는 모르는 글자 종류예요 (title, date, groupName, participants, static 중 하나)`,
      };
    }
    const fallback = /fallback="([^"]*)"/.exec(text[2])?.[1];
    return fallback ? { kind: "text", bind, fallback } : { kind: "text", bind };
  }

  // 규칙과 비슷하지만 틀린 이름 (오타로 그림에 구워지는 걸 막으려고 알려 줌)
  if (/^(photo|text|guide)/i.test(name)) {
    return {
      kind: "suspicious",
      reason: "규칙과 비슷하지만 맞지 않는 이름이에요",
    };
  }
  return { kind: "art" };
}

export const photoLayerName = (index: number) => `photo-${index}`;

export function textLayerName(bind: TextBind, fallback?: string) {
  return fallback ? `text:${bind} fallback="${fallback}"` : `text:${bind}`;
}
