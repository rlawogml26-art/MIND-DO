// 피그마 좌표를 형식 좌표로 바꾸는 계산 (피그마 API 없이 계산만 해서 따로 시험할 수 있게 둠)

// 피그마의 변환 행렬: x' = a·x + c·y + tx, y' = b·x + d·y + ty
export type Transform = [[number, number, number], [number, number, number]];

export type RotatedBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number; // 칸 가운데 기준 시계 방향 각도
  flipped: boolean;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

// 회전된 레이어를 "회전 전 칸 + 가운데 기준 회전각"으로 바꾼다.
// 피그마의 x·y는 회전 후 왼쪽 위 꼭짓점이라 그대로 쓰면 위치가 틀어진다.
export function boxFromTransform(
  t: Transform,
  w: number,
  h: number,
  origin: { x: number; y: number },
): RotatedBox {
  const [[a, c, tx], [b, d, ty]] = t;
  const cx = a * (w / 2) + c * (h / 2) + tx - origin.x;
  const cy = b * (w / 2) + d * (h / 2) + ty - origin.y;
  const rotate = (Math.atan2(b, a) * 180) / Math.PI;
  return {
    x: round1(cx - w / 2),
    y: round1(cy - h / 2),
    w: round1(w),
    h: round1(h),
    rotate: round1(Math.abs(rotate) < 0.05 ? 0 : rotate),
    flipped: a * d - b * c < 0,
  };
}

export type Vertex = { x: number; y: number };
export type Segment = {
  start: number;
  end: number;
  tangentStart?: Vertex;
  tangentEnd?: Vertex;
};

// 벡터 선분들을 따라가며 꼭짓점을 둘레 순서대로 늘어놓는다. 닫힌 도형 하나가 아니면 null
export function orderPolygon(
  vertices: Vertex[],
  segments: Segment[],
): Vertex[] | null {
  if (vertices.length < 3 || segments.length !== vertices.length) return null;
  const next = new Map<number, number[]>();
  for (const s of segments) {
    next.set(s.start, [...(next.get(s.start) ?? []), s.end]);
    next.set(s.end, [...(next.get(s.end) ?? []), s.start]);
  }
  if ([...next.values()].some((n) => n.length !== 2)) return null;
  const order = [0];
  let prev = -1;
  let cur = 0;
  while (order.length < vertices.length) {
    const candidates = next.get(cur) ?? [];
    const nxt = candidates[0] === prev ? candidates[1] : candidates[0];
    if (nxt === undefined || order.includes(nxt)) return null;
    order.push(nxt);
    prev = cur;
    cur = nxt;
  }
  return order.map((i) => vertices[i]);
}

export const hasCurves = (segments: Segment[]) =>
  segments.some(
    (s) =>
      (s.tangentStart && (s.tangentStart.x !== 0 || s.tangentStart.y !== 0)) ||
      (s.tangentEnd && (s.tangentEnd.x !== 0 || s.tangentEnd.y !== 0)),
  );

// 꼭짓점을 칸 안의 비율(0~1)로
export function normalizePoints(
  points: Vertex[],
  w: number,
  h: number,
): [number, number][] {
  const clamp = (v: number) =>
    Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
  return points.map((p) => [clamp(p.x / w), clamp(p.y / h)]);
}

export function rgbToHex(c: { r: number; g: number; b: number }) {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`.toUpperCase();
}

export function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

// 글자 회전은 0·90·-90만. 1도 안쪽 오차는 맞춰 주고, 그 밖은 null
export function snapTextRotation(deg: number): 0 | 90 | -90 | null {
  for (const r of [0, 90, -90] as const) if (Math.abs(deg - r) < 1) return r;
  return null;
}

// 레이어 쌓인 순서로 아래 그림 / 위 그림을 나눈다. 사진 사이에 낀 것은 위 그림으로 보내고 따로 알려 준다
export function splitLayers(
  layers: { id: string; index: number }[],
  photoIndices: number[],
): { under: string[]; over: string[]; between: string[] } {
  const min = Math.min(...photoIndices);
  const max = Math.max(...photoIndices);
  const under: string[] = [];
  const over: string[] = [];
  const between: string[] = [];
  for (const l of layers) {
    if (l.index < min) under.push(l.id);
    else if (l.index > max) over.push(l.id);
    else {
      over.push(l.id);
      between.push(l.id);
    }
  }
  return { under, over, between };
}
