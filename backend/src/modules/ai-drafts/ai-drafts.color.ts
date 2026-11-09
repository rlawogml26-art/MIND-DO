import type { PaletteId } from "@mind-do/shared";
import { PALETTE_RULES } from "./ai-drafts.catalog.js";

// 배경색(backgroundColor) 만들기 (AGENTS.md "AI 초안" > 색)
// 사진의 배경색 후보(accentColors, 첫 사진부터 순서대로) 중 첫 번째 색의 색상(hue)을 쓰고,
// 선명도·밝기는 팔레트 규칙을 따른다. 후보가 없으면 팔레트 기본 색을 쓴다.
export function makeBackgroundColor(
  paletteId: PaletteId,
  accentColors: readonly string[],
): string {
  const rule = PALETTE_RULES[paletteId];
  const first = accentColors[0];
  if (!first) return rule.defaultColor;

  const photoHue = hexToHue(first);
  let hue = photoHue;
  if (rule.hueAnchor !== null) {
    const diff = hueDiff(photoHue, rule.hueAnchor);
    hue =
      Math.abs(diff) <= rule.anchorRange
        ? (photoHue + diff * rule.anchorWeight + 360) % 360
        : rule.hueAnchor;
  }
  return hslToHex(hue, rule.saturation, rule.lightness);
}

// a에서 b로 가는 색상환의 짧은 쪽 각도 (-180~180)
function hueDiff(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}
