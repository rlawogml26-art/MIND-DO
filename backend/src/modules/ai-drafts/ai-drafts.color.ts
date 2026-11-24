import { COLOR_DISTANCE_MAX } from "./ai-drafts.catalog.js";

// 디자인 대표 색(mainColor)과 사진 주요 색이 얼마나 가까운지 (AGENTS.md "AI 초안" > 색)
// 사람 눈에 비슷한 정도를 재려고 RGB가 아니라 OKLab 거리를 쓴다.
// 사진 색 후보 중 가장 가까운 색 기준으로 0~1 (1이 가장 가까움). 후보가 없으면 0
export function colorCloseness(
  mainColor: string,
  photoColors: readonly string[],
): number {
  const target = hexToOklab(mainColor);
  let best = Number.POSITIVE_INFINITY;
  for (const color of photoColors) {
    best = Math.min(best, oklabDistance(target, hexToOklab(color)));
  }
  if (!Number.isFinite(best)) return 0;
  return Math.max(0, 1 - best / COLOR_DISTANCE_MAX);
}

type Oklab = { l: number; a: number; b: number };

function oklabDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

function hexToOklab(hex: string): Oklab {
  const [r, g, b] = [1, 3, 5].map((i) =>
    srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  const red = r ?? 0;
  const green = g ?? 0;
  const blue = b ?? 0;
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
