import type { ImageBox, PreparedImage } from "./messages";

// 배경 그림의 단색 바탕을 지우는 계산 (픽셀 배열만 다루는 순수 함수)
// AI 그림은 "단색 바탕 위의 티켓"으로 나오는 경우가 많아서, 귀퉁이 색을 바탕으로 보고
// 가장자리부터 이어진 그 색만 지운다. 애매하면 지우지 않는다 (종이를 잘못 지우는 것보다 낫다)

const OPAQUE_ALPHA = 24; // 이보다 옅은 픽셀은 그림자 찌꺼기로 보고 티켓 영역에 넣지 않는다
const ALREADY_TRANSPARENT = 0.005; // 투명한 픽셀이 이만큼 있으면 이미 누끼 딴 그림
const CORNER_SPREAD = 14; // 네 귀퉁이 색 차이가 이보다 크면 단색 바탕이 아님
const CORNER_NOISE = 8; // 귀퉁이 안의 얼룩(표준편차)이 이보다 크면 바탕이 아니라 종이 질감
const MIN_REMOVED = 0.005; // 이보다 적게 지워지면 지울 바탕이 없는 것
const MAX_REMOVED = 0.6; // 이보다 많이 지워지면 종이까지 먹은 것으로 본다
// 필름 구멍처럼 티켓 안에 갇힌 바탕색 구멍도 지운다. 작은 것만 (사진 자리 같은 넓은 밝은 면은 남김)
const HOLE_MAX = 0.005;
const HOLE_MIN_PX = 64;

type Rgb = [number, number, number];

function opaqueBox(
  alpha: (i: number) => number,
  w: number,
  h: number,
): ImageBox | null {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(y * w + x) > OPAQUE_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0
    ? null
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function patchStats(
  data: Uint8ClampedArray,
  w: number,
  x0: number,
  y0: number,
  size: number,
) {
  const sum: Rgb = [0, 0, 0];
  const sq: Rgb = [0, 0, 0];
  const n = size * size;
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        sum[c] += data[i + c];
        sq[c] += data[i + c] * data[i + c];
      }
    }
  }
  const mean: Rgb = [sum[0] / n, sum[1] / n, sum[2] / n];
  const noise =
    [0, 1, 2]
      .map((c) => Math.sqrt(Math.max(0, sq[c] / n - mean[c] * mean[c])))
      .reduce((a, b) => a + b, 0) / 3;
  return { mean, noise };
}

const distance = (a: Rgb, b: Rgb) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** data(RGBA)를 직접 고친다. status가 "removed"일 때만 바뀐다. */
export function removeFlatBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Omit<PreparedImage, "bytes"> {
  const total = w * h;
  let transparent = 0;
  for (let i = 0; i < total; i++) if (data[i * 4 + 3] < 250) transparent++;
  if (transparent / total > ALREADY_TRANSPARENT) {
    return {
      status: "transparent",
      box: opaqueBox((i) => data[i * 4 + 3], w, h),
      removedPercent: 0,
    };
  }

  const size = Math.max(4, Math.round(Math.min(w, h) * 0.02));
  const corners = [
    patchStats(data, w, 0, 0, size),
    patchStats(data, w, w - size, 0, size),
    patchStats(data, w, 0, h - size, size),
    patchStats(data, w, w - size, h - size, size),
  ];
  const avg = (c: number) => corners.reduce((s, k) => s + k.mean[c], 0) / 4;
  const bg: Rgb = [avg(0), avg(1), avg(2)];
  const spread = Math.max(...corners.map((k) => distance(k.mean, bg)));
  const noise = Math.max(...corners.map((k) => k.noise));
  if (spread > CORNER_SPREAD || noise > CORNER_NOISE) {
    return { status: "not-uniform", box: null, removedPercent: 0 };
  }

  // 바탕의 얼룩 정도에 맞춰 기준을 조금 넓힌다. low 이하는 완전히 지우고 high까지는 반투명
  const low = 18 + noise * 2;
  const high = low + 27;
  const alpha = new Uint8Array(total).fill(255);
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  let top = 0;
  const push = (i: number) => {
    if (!seen[i]) {
      seen[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  let removed = 0;
  while (top > 0) {
    const i = stack[--top];
    const p = i * 4;
    const d = distance([data[p], data[p + 1], data[p + 2]], bg);
    if (d > high) continue;
    alpha[i] = d <= low ? 0 : Math.round(((d - low) / (high - low)) * 255);
    if (alpha[i] === 0) removed++;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < total - w) push(i + w);
  }

  // 가장자리와 이어지지 않은 바탕색 구멍 찾기
  const component = new Int32Array(total);
  for (let start = 0; start < total; start++) {
    if (seen[start]) continue;
    const p0 = start * 4;
    if (distance([data[p0], data[p0 + 1], data[p0 + 2]], bg) > low) continue;
    let size = 0;
    top = 0;
    seen[start] = 1;
    stack[top++] = start;
    while (top > 0) {
      const i = stack[--top];
      const p = i * 4;
      if (distance([data[p], data[p + 1], data[p + 2]], bg) > high) continue;
      component[size++] = i;
      const x = i % w;
      const next = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        i >= w ? i - w : -1,
        i < total - w ? i + w : -1,
      ];
      for (const j of next) {
        if (j >= 0 && !seen[j]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (size >= HOLE_MIN_PX && size <= total * HOLE_MAX) {
      for (let k = 0; k < size; k++) {
        const i = component[k];
        const p = i * 4;
        const d = distance([data[p], data[p + 1], data[p + 2]], bg);
        alpha[i] = d <= low ? 0 : Math.round(((d - low) / (high - low)) * 255);
        if (alpha[i] === 0) removed++;
      }
    }
  }

  const ratio = removed / total;
  const removedPercent = Math.round(ratio * 1000) / 10;
  if (ratio < MIN_REMOVED) {
    return { status: "opaque-full", box: null, removedPercent };
  }
  if (ratio > MAX_REMOVED) {
    return { status: "too-much", box: null, removedPercent };
  }
  for (let i = 0; i < total; i++) data[i * 4 + 3] = alpha[i];
  return {
    status: "removed",
    box: opaqueBox((i) => alpha[i], w, h),
    removedPercent,
  };
}
