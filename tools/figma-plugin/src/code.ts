import {
  DESIGN_CATEGORIES,
  DESIGN_CATEGORY_PAGE_NAMES,
  DESIGN_FONTS,
  DESIGN_LAYOUTS,
  DESIGN_ORIENTATIONS,
  DESIGN_PHOTO_COUNTS,
  designFileSchema,
  type DesignCategory,
  type DesignFile,
  type DesignOrientation,
  type DesignPhotoSlot,
  type DesignText,
} from "@mind-do/shared";
import {
  boxFromTransform,
  hasCurves,
  hexToRgb,
  normalizePoints,
  orderPolygon,
  rgbToHex,
  snapTextRotation,
  splitLayers,
  type Transform,
} from "./lib/geometry";
import type {
  AssignRole,
  PreparedImage,
  ImageJob,
  Issue,
  Meta,
  SelectionState,
  ToCode,
  ToUi,
} from "./lib/messages";
import {
  parseLayerName,
  photoLayerName,
  textLayerName,
  type TextBind,
} from "./lib/names";

const MARK = "memore-design";
const META = "memore-meta";
type Layout = (typeof DESIGN_LAYOUTS)[DesignOrientation];
type Rect = { x: number; y: number; w: number; h: number };
const FONT_FAMILY_TO_ID = new Map<string, keyof typeof DESIGN_FONTS>(
  Object.entries(DESIGN_FONTS).map(([id, family]) => [
    family,
    id as keyof typeof DESIGN_FONTS,
  ]),
);

figma.showUI(__html__, { width: 380, height: 640, themeColors: true });
const post = (msg: ToUi) => figma.ui.postMessage(msg);

// ─── 디자인 찾기 ─────────────────────────────────────────

function findDesignFrame(node: BaseNode | null): FrameNode | null {
  let cur: BaseNode | null = node;
  while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
    if (
      cur.type === "FRAME" &&
      (cur.getPluginData(MARK) === "1" || cur.name.startsWith("design:"))
    ) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

function categoryOfPage(): DesignCategory | null {
  const name = figma.currentPage.name.trim();
  for (const c of DESIGN_CATEGORIES)
    if (DESIGN_CATEGORY_PAGE_NAMES[c] === name) return c;
  return null;
}

function readMeta(frame: FrameNode): Meta {
  const fallback: Meta = {
    id: "",
    name: frame.name.replace(/^design:/, ""),
    tags: [],
    mainColor: "#E794AE",
  };
  try {
    const saved = frame.getPluginData(META);
    return saved
      ? { ...fallback, ...(JSON.parse(saved) as Partial<Meta>) }
      : fallback;
  } catch {
    return fallback;
  }
}

function sendSelection() {
  const frame = findDesignFrame(figma.currentPage.selection[0] ?? null);
  const state: SelectionState = frame
    ? {
        status: "design",
        meta: readMeta(frame),
        category: categoryOfPage(),
        pageName: figma.currentPage.name,
      }
    : { status: "none" };
  post({ type: "selection", state });
}

// ─── 방향 ────────────────────────────────────────────────

// 판(ticket-n) 크기로 방향을 정한다. 가로(2000×800)도 세로(800×2000)도 아니면 null
function orientationOf(ticket: FrameNode): DesignOrientation | null {
  return (
    DESIGN_ORIENTATIONS.find(
      (o) =>
        Math.abs(ticket.width - DESIGN_LAYOUTS[o].ticket.w) <= 1 &&
        Math.abs(ticket.height - DESIGN_LAYOUTS[o].ticket.h) <= 1,
    ) ?? null
  );
}

const SIZE_TEXT = DESIGN_ORIENTATIONS.map((o) => {
  const t = DESIGN_LAYOUTS[o].ticket;
  return `${o === "vertical" ? "세로" : "가로"} ${t.w}×${t.h}`;
}).join(" 또는 ");

const ratioText = (layout: Layout) =>
  layout.ticket.w > layout.ticket.h ? "2.5:1" : "1:2.5";

const inRect = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

// ─── 빈 틀 만들기 ────────────────────────────────────────

type BlankText = {
  bind: TextBind;
  fallback?: string;
  chars: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  bold?: boolean;
  maxLines?: number;
};

// 방향별 기본 사진 자리와 글자 자리. 좌표는 공동 쪽·개인 쪽 각자의 왼쪽 위 기준
const BLANK: Record<
  DesignOrientation,
  {
    photos: Record<string, [number, number, number, number][]>;
    stubTexts: BlankText[];
    bodyTexts: BlankText[];
  }
> = {
  horizontal: {
    // 개인 쪽 오른쪽 열(1200~)은 글자 자리
    photos: {
      "1": [[60, 60, 1100, 680]],
      "2": [
        [60, 60, 540, 680],
        [620, 60, 540, 680],
      ],
      "3": [
        [60, 60, 720, 680],
        [800, 60, 360, 330],
        [800, 410, 360, 330],
      ],
      "4": [
        [60, 60, 540, 330],
        [620, 60, 540, 330],
        [60, 410, 540, 330],
        [620, 410, 540, 330],
      ],
    },
    stubTexts: [
      {
        bind: "static",
        chars: "memo:re",
        x: 40,
        y: 48,
        w: 320,
        h: 40,
        size: 28,
        bold: true,
      },
      {
        bind: "title",
        fallback: "우리의 하루",
        chars: "부산 바다 여행",
        x: 40,
        y: 300,
        w: 320,
        h: 130,
        size: 48,
        bold: true,
        maxLines: 2,
      },
      {
        bind: "date",
        chars: "2026.11.16",
        x: 40,
        y: 600,
        w: 320,
        h: 50,
        size: 30,
      },
      {
        bind: "groupName",
        chars: "마인두",
        x: 40,
        y: 660,
        w: 320,
        h: 50,
        size: 28,
        bold: true,
      },
      {
        bind: "participants",
        chars: "이름 · 이름 · 이름 · 이름",
        x: 40,
        y: 716,
        w: 320,
        h: 40,
        size: 22,
      },
    ],
    bodyTexts: [
      {
        bind: "date",
        chars: "2026.11.16",
        x: 1220,
        y: 80,
        w: 320,
        h: 50,
        size: 30,
      },
    ],
  },
  vertical: {
    // 개인 쪽 아래(1260~)는 글자 자리
    photos: {
      "1": [[60, 60, 680, 1180]],
      "2": [
        [60, 60, 680, 580],
        [60, 660, 680, 580],
      ],
      "3": [
        [60, 60, 680, 700],
        [60, 780, 330, 460],
        [410, 780, 330, 460],
      ],
      "4": [
        [60, 60, 330, 580],
        [410, 60, 330, 580],
        [60, 660, 330, 580],
        [410, 660, 330, 580],
      ],
    },
    stubTexts: [
      {
        bind: "static",
        chars: "memo:re",
        x: 40,
        y: 40,
        w: 320,
        h: 40,
        size: 28,
        bold: true,
      },
      {
        bind: "title",
        fallback: "우리의 하루",
        chars: "부산 바다 여행",
        x: 40,
        y: 100,
        w: 720,
        h: 130,
        size: 48,
        bold: true,
        maxLines: 2,
      },
      {
        bind: "date",
        chars: "2026.11.16",
        x: 40,
        y: 250,
        w: 320,
        h: 50,
        size: 30,
      },
      {
        bind: "groupName",
        chars: "마인두",
        x: 420,
        y: 250,
        w: 340,
        h: 50,
        size: 28,
        bold: true,
      },
      {
        bind: "participants",
        chars: "이름 · 이름 · 이름 · 이름",
        x: 40,
        y: 320,
        w: 720,
        h: 40,
        size: 22,
      },
    ],
    bodyTexts: [
      {
        bind: "date",
        chars: "2026.11.16",
        x: 60,
        y: 1300,
        w: 320,
        h: 50,
        size: 30,
      },
    ],
  },
};

const solid = (hex: string, opacity = 1): SolidPaint => ({
  type: "SOLID",
  color: hexToRgb(hex),
  opacity,
});

async function loadFonts() {
  const fonts: FontName[] = [
    { family: DESIGN_FONTS.sans, style: "Regular" },
    { family: DESIGN_FONTS.sans, style: "Bold" },
  ];
  try {
    await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
    return DESIGN_FONTS.sans;
  } catch {
    return null;
  }
}

function addText(
  parent: FrameNode,
  family: string,
  o: BlankText,
  offset: { x: number; y: number },
) {
  const t = figma.createText();
  t.fontName = { family, style: o.bold ? "Bold" : "Regular" };
  t.characters = o.chars;
  t.fontSize = o.size;
  t.fills = [solid("#2B2B2B")];
  t.textAutoResize = "NONE";
  t.resize(o.w, o.h);
  t.x = offset.x + o.x;
  t.y = offset.y + o.y;
  t.name = textLayerName(o.bind, o.fallback);
  if (o.maxLines && o.maxLines > 1) {
    t.textTruncation = "ENDING";
    t.maxLines = o.maxLines;
  }
  parent.appendChild(t);
}

async function createBlank(orientation: DesignOrientation) {
  const family = await loadFonts();
  if (!family) {
    post({
      type: "notice",
      message: `글꼴 "${DESIGN_FONTS.sans}"을 불러오지 못했어요. 피그마에 이 글꼴이 있는지 확인해 주세요.`,
    });
    return;
  }
  const layout = DESIGN_LAYOUTS[orientation];
  const { ticket: size, stub: stubArea, body: bodyArea } = layout;
  const spec = BLANK[orientation];
  // 가로형은 위아래로, 세로형은 옆으로 4장을 늘어놓는다
  const sideBySide = orientation === "vertical";
  const gap = 120;
  const span = (len: number) => len * 4 + gap * 3;
  const design = figma.createFrame();
  design.name = "design:새 디자인";
  design.fills = [];
  design.clipsContent = false;
  design.resize(
    sideBySide ? span(size.w) : size.w,
    sideBySide ? size.h : span(size.h),
  );
  design.setPluginData(MARK, "1");
  const view = figma.viewport.center;
  design.x = Math.round(view.x - design.width / 2);
  design.y = Math.round(view.y - design.height / 2);
  figma.currentPage.appendChild(design);

  DESIGN_PHOTO_COUNTS.forEach((n, i) => {
    const t = figma.createFrame();
    t.name = `ticket-${n}`;
    t.resize(size.w, size.h);
    if (sideBySide) t.x = i * (size.w + gap);
    else t.y = i * (size.h + gap);
    t.cornerRadius = 24;
    t.clipsContent = true;
    t.fills = [solid("#F7F3EE")];
    design.appendChild(t);

    // 아래 그림이 될 기본 레이어 (자유롭게 바꾸거나 지워도 됨)
    const stub = figma.createRectangle();
    stub.name = "공동 쪽 배경";
    stub.resize(stubArea.w, stubArea.h);
    stub.x = stubArea.x;
    stub.y = stubArea.y;
    stub.fills = [solid("#E8D9C5")];
    t.appendChild(stub);

    // 절취선: 두 홈 사이를 잇는 점선 (양 끝 60px은 비움)
    const [a, b] = layout.notches;
    const perf = figma.createLine();
    perf.name = "절취선";
    perf.resize(Math.hypot(b.x - a.x, b.y - a.y) - 2 * 60, 0);
    perf.strokes = [solid("#9C8B7A")];
    perf.strokeWeight = 3;
    perf.dashPattern = [16, 12];
    if (a.x === b.x) {
      perf.rotation = -90;
      perf.x = a.x;
      perf.y = a.y + 60;
    } else {
      perf.x = a.x + 60;
      perf.y = a.y;
    }
    t.appendChild(perf);

    // 사진 자리 (사진 수만큼). 그림보다 위에 둔다
    spec.photos[n].forEach(([x, y, w, h], k) => {
      const r = figma.createRectangle();
      r.name = photoLayerName(k + 1);
      r.resize(w, h);
      r.x = bodyArea.x + x;
      r.y = bodyArea.y + y;
      r.cornerRadius = 16;
      r.fills = [solid("#C9C3BA")];
      t.appendChild(r);
    });

    // 안내용: 절취선 양 끝 홈 (앱에서 이 크기로 잘림, 내보낼 때 빠짐)
    for (const c of layout.notches) {
      const notch = figma.createEllipse();
      notch.name = "guide:notch";
      notch.resize(56, 56);
      notch.x = c.x - 28;
      notch.y = c.y - 28;
      notch.fills = [solid("#FFFFFF")];
      t.appendChild(notch);
    }

    // 글자 자리 (예시 글자는 앱에서 공동 티켓 값으로 바뀜)
    spec.stubTexts.forEach((o) => addText(t, family, o, stubArea));
    spec.bodyTexts.forEach((o) => addText(t, family, o, bodyArea));
  });

  figma.currentPage.selection = [design];
  figma.viewport.scrollAndZoomIntoView([design]);
  sendSelection();
  post({
    type: "notice",
    message: `${orientation === "vertical" ? "세로" : "가로"} 빈 틀을 만들었어요. 맨 바깥 프레임 이름을 바꾸고 꾸며 주세요.`,
  });
}

// ─── 배경으로 깔기 ───────────────────────────────────────

const BG_MARK = "memore-bg";
// 빈 틀이 깔아 둔 기본 그림. AI 배경을 깔면 가리기만 하므로 지운다
const BLANK_ART_NAMES = ["공동 쪽 배경", "절취선"];

function imageHashOf(node: SceneNode): string | null {
  if (!("fills" in node) || node.fills === figma.mixed) return null;
  const paint = node.fills.find(
    (p): p is ImagePaint => p.type === "IMAGE" && p.imageHash !== null,
  );
  return paint?.imageHash ?? null;
}

function designsOnPage(): FrameNode[] {
  return figma.currentPage.children.filter(
    (c): c is FrameNode => c.type === "FRAME" && findDesignFrame(c) === c,
  );
}

async function applyBackground() {
  const selection = figma.currentPage.selection;
  const images = selection.filter((n) => imageHashOf(n) !== null);
  if (images.length !== 1) {
    return post({
      type: "notice",
      message: "캔버스에 놓은 배경 이미지 하나를 골라 주세요.",
    });
  }
  const image = images[0];
  const hash = imageHashOf(image);
  const source = hash ? figma.getImageByHash(hash) : null;
  if (!hash || !source) {
    return post({ type: "notice", message: "이미지를 읽지 못했어요." });
  }

  let design =
    selection.map((n) => findDesignFrame(n)).find((f) => f !== null) ?? null;
  if (!design) {
    const designs = designsOnPage();
    if (designs.length !== 1) {
      return post({
        type: "notice",
        message:
          designs.length === 0
            ? "이 페이지에 디자인이 없어요. 먼저 [빈 틀 만들기]를 눌러 주세요."
            : "디자인이 여러 개예요. 이미지와 넣을 디자인을 Shift+클릭으로 같이 골라 주세요.",
      });
    }
    design = designs[0];
  }

  const tickets = DESIGN_PHOTO_COUNTS.map((n) =>
    design.children.find(
      (c): c is FrameNode => c.type === "FRAME" && c.name === `ticket-${n}`,
    ),
  );
  const found = tickets.filter((t): t is FrameNode => t !== undefined);
  if (found.length !== tickets.length) {
    return post({
      type: "notice",
      message:
        "ticket-1~4 판을 찾지 못했어요. [빈 틀 만들기]로 만든 구조를 지켜 주세요.",
    });
  }

  const orientation = orientationOf(found[0]);
  if (!orientation || found.some((t) => orientationOf(t) !== orientation)) {
    return post({
      type: "notice",
      message: `ticket-1~4 판의 크기가 ${SIZE_TEXT} 중 하나로 같아야 해요.`,
    });
  }
  const layout = DESIGN_LAYOUTS[orientation];
  const size = layout.ticket;

  const { width, height } = await source.getSizeAsync();
  const prepared = await prepareImage(await source.getBytesAsync());
  // 바탕을 지운 새 그림이 오면 그걸 쓴다 (원본 해상도 그대로)
  const useHash = prepared.bytes
    ? figma.createImage(prepared.bytes).hash
    : hash;
  const box = prepared.box;
  // 투명한 여백이 있으면(누끼 딴 그림) 그 여백을 잘라 내고 티켓 부분만 판에 맞춘다.
  // 비율이 다르면 늘이지 않고 통째로 들어가게 줄여서 가운데에 둔다
  const trimmed =
    box !== null &&
    (box.w < width * 0.98 || box.h < height * 0.98) &&
    box.w > 0 &&
    box.h > 0;
  const fit = trimmed
    ? (() => {
        const s = Math.min(size.w / box.w, size.h / box.h);
        const w = Math.round(box.w * s);
        const h = Math.round(box.h * s);
        return {
          x: Math.round((size.w - w) / 2),
          y: Math.round((size.h - h) / 2),
          w,
          h,
          scale: s,
        };
      })()
    : {
        x: 0,
        y: 0,
        w: size.w,
        h: size.h,
        scale: Math.max(size.w / width, size.h / height),
      };
  const paint: ImagePaint = trimmed
    ? {
        type: "IMAGE",
        imageHash: useHash,
        scaleMode: "CROP",
        imageTransform: [
          [box.w / width, 0, box.x / width],
          [0, box.h / height, box.y / height],
        ],
      }
    : { type: "IMAGE", imageHash: useHash, scaleMode: "FILL" };

  for (const ticket of found) {
    let bg = ticket.children.find(
      (c): c is RectangleNode =>
        c.type === "RECTANGLE" && c.getPluginData(BG_MARK) === "1",
    );
    if (!bg) {
      bg = figma.createRectangle();
      bg.name = "배경";
      bg.setPluginData(BG_MARK, "1");
      ticket.insertChild(0, bg);
    }
    bg.rotation = 0;
    bg.resize(fit.w, fit.h);
    bg.x = fit.x;
    bg.y = fit.y;
    bg.fills = [paint];
    // 판 바탕색이 남아 있으면 누끼 딴 배경의 투명한 부분에 그 색이 같이 구워진다
    ticket.fills = [];
    for (const c of [...ticket.children]) {
      if (c.type !== "FRAME" && BLANK_ART_NAMES.includes(c.name)) c.remove();
    }
  }
  // 티켓 안에 직접 끌어다 놓은 이미지를 그대로 배경으로 쓴 경우는 지우지 않는다
  if (image.getPluginData(BG_MARK) !== "1") image.remove();

  figma.currentPage.selection = [design];
  sendSelection();

  const notes = ["배경을 4장 판에 깔았어요. 되돌리려면 Ctrl+Z."];
  const statusNote: Record<PreparedImage["status"], string> = {
    transparent: "",
    removed: `단색 바탕(그림의 ${prepared.removedPercent}%)을 지웠어요. 가장자리가 잘 지워졌는지 확대해서 봐 주세요.`,
    "opaque-full": "",
    "not-uniform":
      "⚠ 바탕이 한 가지 색이 아니라 지우지 않았어요. 배경을 지운 투명 PNG를 넣거나, 단색 바탕으로 다시 만들어 주세요.",
    "too-much":
      "⚠ 바탕과 티켓 색이 비슷해서 지우지 않았어요 (종이까지 지워질 수 있어서). 배경을 지운 투명 PNG를 넣어 주세요.",
    failed: "⚠ 그림을 읽지 못해 바탕을 지우지 않았어요.",
  };
  if (statusNote[prepared.status]) notes.push(statusNote[prepared.status]);
  if (trimmed) {
    notes.push(
      `투명한 여백을 잘라 내고 티켓 부분(${box.w}×${box.h}px)만 맞췄어요.`,
    );
    if (fit.w < size.w - 2 || fit.h < size.h - 2) {
      notes.push(
        `티켓 비율이 ${(box.w / box.h).toFixed(2)}:1이라 ${fit.w < size.w - 2 ? "좌우" : "위아래"}에 투명한 틈이 남아요 (판은 ${ratioText(layout)}).`,
      );
    }
  } else {
    const ratio = width / height;
    const target = size.w / size.h;
    if (Math.abs(ratio / target - 1) > 0.01) {
      const cut =
        ratio > target
          ? `좌우가 약 ${Math.round((size.h * ratio - size.w) / 2)}px씩`
          : `위아래가 약 ${Math.round((size.w / ratio - size.h) / 2)}px씩`;
      notes.push(
        `이미지 비율이 ${ratio.toFixed(2)}:1이라 ${cut} 잘렸어요 (티켓은 ${ratioText(layout)}).`,
      );
    }
  }
  if (fit.scale > MAX_IMAGE_UPSCALE) {
    notes.push(lowResMessage(fit.scale));
  }
  post({ type: "notice", message: notes.join("\n") });
}

// 이보다 크게 늘이면 앱에서 흐릿하게 보인다. 피그마 에이전트처럼 몰래 해상도를 줄이는 도구를 잡는 용도
const MAX_IMAGE_UPSCALE = 1.5;
const lowResMessage = (scale: number) =>
  `⚠ 그림 해상도가 낮아 ${Math.round(scale * 100)}%로 늘어났어요. 앱에서 흐리게 보여요. 원본 크기 그대로 배경을 지운 PNG를 넣어 주세요.`;

// 판 안 그림 레이어가 원본 픽셀보다 몇 배로 늘어나 그려지는지
async function imageUpscale(node: SceneNode): Promise<number | null> {
  if (!node.visible || !("fills" in node) || node.fills === figma.mixed)
    return null;
  let worst: number | null = null;
  for (const paint of node.fills) {
    if (paint.type !== "IMAGE" || !paint.imageHash || paint.visible === false)
      continue;
    const image = figma.getImageByHash(paint.imageHash);
    if (!image) continue;
    const { width, height } = await image.getSizeAsync();
    let scale: number | null = null;
    if (paint.scaleMode === "FILL")
      scale = Math.max(node.width / width, node.height / height);
    else if (paint.scaleMode === "FIT")
      scale = Math.min(node.width / width, node.height / height);
    else if (paint.scaleMode === "CROP" && paint.imageTransform) {
      const [[a], [, d]] = paint.imageTransform;
      scale = Math.max(node.width / (a * width), node.height / (d * height));
    }
    if (scale !== null && (worst === null || scale > worst)) worst = scale;
  }
  return worst;
}

// ─── 그림 다듬기 (창에 맡김) ─────────────────────────────

// 피그마 쪽 코드는 그림을 픽셀로 다룰 수 없어서, 창(브라우저)에서 바탕을 지우고 여백을 잰다
const pendingImages = new Map<number, (r: PreparedImage) => void>();
let nextImageId = 1;
const FAILED: PreparedImage = {
  status: "failed",
  box: null,
  bytes: null,
  removedPercent: 0,
};

function prepareImage(bytes: Uint8Array): Promise<PreparedImage> {
  return new Promise((resolve) => {
    const id = nextImageId++;
    const timer = setTimeout(() => {
      pendingImages.delete(id);
      resolve(FAILED);
    }, 30000);
    pendingImages.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    post({ type: "prepare-image", id, bytes });
  });
}

// ─── 이름 붙이기 ─────────────────────────────────────────

function assign(role: AssignRole) {
  const node = figma.currentPage.selection[0];
  if (!node)
    return post({ type: "notice", message: "먼저 레이어를 하나 골라 주세요." });
  const ticket = node.parent;
  if (
    !ticket ||
    ticket.type !== "FRAME" ||
    !/^ticket-[1-4]$/.test(ticket.name)
  ) {
    return post({
      type: "notice",
      message: "티켓 판(ticket-1~4) 바로 안에 있는 레이어를 골라 주세요.",
    });
  }
  if (role === "photo") {
    const used = ticket.children
      .map((c) => parseLayerName(c.name))
      .filter((p) => p.kind === "photo").length;
    node.name = photoLayerName(used + 1);
  } else {
    if (node.type !== "TEXT")
      return post({
        type: "notice",
        message: "글자 자리는 글자 레이어만 될 수 있어요.",
      });
    node.name = textLayerName(
      role,
      role === "title" ? "우리의 하루" : undefined,
    );
  }
  post({ type: "notice", message: `"${node.name}"(으)로 이름을 붙였어요.` });
}

// ─── 읽어서 형식으로 바꾸기 ───────────────────────────────

type Plan = {
  ticket: FrameNode;
  hide: SceneNode[]; // 사진·글자·안내 (항상 숨김)
  under: SceneNode[];
  over: SceneNode[];
};

const originOf = (n: SceneNode) => ({
  x: n.absoluteTransform[0][2],
  y: n.absoluteTransform[1][2],
});

function firstSolid(
  paints: readonly Paint[] | typeof figma.mixed,
): SolidPaint | null {
  if (paints === figma.mixed) return null;
  return (
    (paints.find((p) => p.visible !== false && p.type === "SOLID") as
      SolidPaint | undefined) ?? null
  );
}

async function polygonPoints(
  node: SceneNode,
  issues: Issue[],
): Promise<[number, number][] | null> {
  // 별·다각형·불리언도 같은 방식으로 읽으려고 복사본을 회전 없이 벡터로 바꿔서 꼭짓점을 읽는다
  const clone = node.clone();
  figma.currentPage.appendChild(clone);
  if ("rotation" in clone) clone.rotation = 0;
  const flat = figma.flatten([clone]);
  try {
    const net = flat.vectorNetwork;
    if (hasCurves(net.segments as never)) {
      issues.push({
        level: "warn",
        message: `"${node.name}"의 곡선은 직선으로 바뀌어요.`,
        nodeId: node.id,
      });
    }
    const ordered = orderPolygon(
      net.vertices.map((v) => ({ x: v.x, y: v.y })),
      net.segments.map((s) => ({ ...s })),
    );
    if (!ordered) {
      issues.push({
        level: "error",
        message: `"${node.name}"은 닫힌 도형 하나여야 해요.`,
        nodeId: node.id,
      });
      return null;
    }
    if (ordered.length > 64) {
      issues.push({
        level: "error",
        message: `"${node.name}"의 꼭짓점이 너무 많아요 (64개까지).`,
        nodeId: node.id,
      });
      return null;
    }
    return normalizePoints(ordered, flat.width, flat.height);
  } finally {
    flat.remove();
  }
}

async function readPhoto(
  node: SceneNode,
  origin: { x: number; y: number },
  layout: Layout,
  issues: Issue[],
): Promise<DesignPhotoSlot | null> {
  const box = boxFromTransform(
    node.absoluteTransform as Transform,
    node.width,
    node.height,
    origin,
  );
  if (box.flipped)
    issues.push({
      level: "error",
      message: `"${node.name}"이 뒤집혀 있어요.`,
      nodeId: node.id,
    });
  if (inRect(layout.stub, box.x + box.w / 2, box.y + box.h / 2)) {
    issues.push({
      level: "error",
      message: `"${node.name}"이 공동 쪽에 있어요. 사진은 개인 쪽에만 들어가요.`,
      nodeId: node.id,
    });
    return null;
  }
  if ("strokes" in node && node.strokes.length > 0) {
    issues.push({
      level: "warn",
      message: `"${node.name}"에 넣은 테두리는 앱에서 안 나와요. 액자는 사진 자리 아래에 따로 그려 주세요.`,
      nodeId: node.id,
    });
  }
  const base = {
    x: box.x - layout.body.x,
    y: box.y - layout.body.y,
    w: box.w,
    h: box.h,
    rotate: box.rotate,
  };
  if (node.type === "RECTANGLE") {
    const r =
      node.cornerRadius === figma.mixed
        ? node.topLeftRadius
        : node.cornerRadius;
    if (node.cornerRadius === figma.mixed) {
      issues.push({
        level: "warn",
        message: `"${node.name}" 모서리가 제각각이라 왼쪽 위 값으로 맞춰요.`,
        nodeId: node.id,
      });
    }
    return { ...base, shape: "rect", radius: r };
  }
  if (node.type === "ELLIPSE") return { ...base, shape: "ellipse", radius: 0 };
  if (
    node.type === "POLYGON" ||
    node.type === "STAR" ||
    node.type === "VECTOR" ||
    node.type === "BOOLEAN_OPERATION"
  ) {
    const points = await polygonPoints(node, issues);
    return points ? { ...base, shape: "polygon", points, radius: 0 } : null;
  }
  issues.push({
    level: "error",
    message: `"${node.name}"은 네모·원·다각형·별·벡터 중 하나여야 해요.`,
    nodeId: node.id,
  });
  return null;
}

function readText(
  node: SceneNode,
  bind: TextBind,
  fallback: string | undefined,
  origin: { x: number; y: number },
  issues: Issue[],
) {
  if (node.type !== "TEXT") {
    issues.push({
      level: "error",
      message: `"${node.name}"은 글자 레이어여야 해요.`,
      nodeId: node.id,
    });
    return null;
  }
  const err = (m: string) =>
    issues.push({
      level: "error",
      message: `"${node.name}": ${m}`,
      nodeId: node.id,
    });
  const box = boxFromTransform(
    node.absoluteTransform as Transform,
    node.width,
    node.height,
    origin,
  );
  const rotate = snapTextRotation(box.rotate);
  if (rotate === null) err("글자는 0·90·-90도로만 돌릴 수 있어요.");
  if (node.fontName === figma.mixed || node.fontSize === figma.mixed) {
    err("한 글자 칸 안에서는 글꼴·크기가 같아야 해요.");
    return null;
  }
  const font = FONT_FAMILY_TO_ID.get(node.fontName.family);
  if (!font)
    err(
      `글꼴 "${node.fontName.family}"은 앱에서 쓸 수 없어요 (${Object.values(DESIGN_FONTS).join(", ")}).`,
    );
  const fill = firstSolid(node.fills);
  if (!fill) err("글자 색은 단색이어야 해요.");
  if (!font || !fill || rotate === null) return null;

  const size = Math.round(node.fontSize);
  const style = node.fontName.style.toLowerCase();
  const weight = /bold|black|heavy/.test(style) ? "bold" : "regular";
  const ls = node.letterSpacing === figma.mixed ? null : node.letterSpacing;
  const letterSpacing = ls
    ? Math.round(
        (ls.unit === "PIXELS" ? ls.value : (ls.value * size) / 100) * 10,
      ) / 10
    : 0;
  const lines =
    node.textTruncation === "ENDING" && node.maxLines
      ? node.maxLines
      : Math.max(1, Math.floor(box.h / (size * 1.2)));
  const maxLines = Math.min(3, lines);
  if (box.h < maxLines * size * 1.2) {
    issues.push({
      level: "warn",
      message: `"${node.name}" 칸 높이가 빠듯해요. 앱에서 글자가 잘릴 수 있어요.`,
      nodeId: node.id,
    });
  }
  const align =
    node.textAlignHorizontal === "CENTER"
      ? "center"
      : node.textAlignHorizontal === "RIGHT"
        ? "right"
        : "left";

  const text: DesignText = {
    bind,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    font,
    size,
    weight,
    color: rgbToHex(fill.color),
    align,
    rotate,
    maxLines,
    letterSpacing,
  };
  if (bind === "static") text.value = node.characters.trim();
  if (fallback) text.fallback = fallback;
  const stroke = firstSolid(node.strokes);
  if (
    stroke &&
    typeof node.strokeWeight === "number" &&
    node.strokeWeight > 0
  ) {
    text.stroke = {
      color: rgbToHex(stroke.color),
      width: Math.round(node.strokeWeight),
    };
  }
  const shadow = node.effects.find(
    (e): e is DropShadowEffect => e.type === "DROP_SHADOW" && e.visible,
  );
  if (shadow) {
    text.shadow = {
      color: rgbToHex(shadow.color),
      dx: Math.round(shadow.offset.x),
      dy: Math.round(shadow.offset.y),
    };
    if (shadow.radius > 0) {
      issues.push({
        level: "warn",
        message: `"${node.name}" 그림자의 흐림은 앱에서 빠져요.`,
        nodeId: node.id,
      });
    }
  }
  return { text, center: { x: box.x + box.w / 2, y: box.y + box.h / 2 } };
}

async function convert(frame: FrameNode): Promise<{
  issues: Issue[];
  design: DesignFile | null;
  plans: Plan[];
  layout: Layout;
}> {
  const issues: Issue[] = [];
  const plans: Plan[] = [];
  const meta = readMeta(frame);
  const category = categoryOfPage();
  if (!category) {
    issues.push({
      level: "error",
      message: `페이지 이름이 "${figma.currentPage.name}"이에요. ${Object.values(DESIGN_CATEGORY_PAGE_NAMES).join("·")} 중 하나인 페이지에서 만들어 주세요.`,
    });
  }

  const body: Record<
    string,
    {
      under: string;
      over?: string;
      photos: DesignPhotoSlot[];
      texts: DesignText[];
    }
  > = {};
  let stubTexts: DesignText[] = [];
  // 형식 검사 오류의 위치(예: stub.texts.1)를 피그마 레이어로 되짚기 위한 표
  const pathNodes = new Map<string, SceneNode>();
  // 같은 그림을 4장 판에 깔면 경고가 4번 나오지 않게 한 번만 알린다
  const warnedImages = new Set<string>();
  let cornerRadius = 24;
  let notchRadius = 0;
  // 방향은 ticket-1 크기로 정하고, 나머지 판도 같은 크기인지 본다
  const first = frame.children.find(
    (c): c is FrameNode => c.type === "FRAME" && c.name === "ticket-1",
  );
  const orientation = (first && orientationOf(first)) ?? "horizontal";
  const layout = DESIGN_LAYOUTS[orientation];

  for (const n of DESIGN_PHOTO_COUNTS) {
    const ticket = frame.children.find(
      (c): c is FrameNode => c.type === "FRAME" && c.name === `ticket-${n}`,
    );
    if (!ticket) {
      issues.push({
        level: "error",
        message: `"ticket-${n}" 판이 없어요. [빈 틀 만들기]로 만든 구조를 지켜 주세요.`,
        nodeId: frame.id,
      });
      continue;
    }
    const bad = (m: string) =>
      issues.push({ level: "error", message: m, nodeId: ticket.id });
    if (orientationOf(ticket) !== orientation) {
      bad(
        n === "1"
          ? `ticket-1의 크기가 ${SIZE_TEXT}이 아니에요.`
          : `ticket-${n}의 크기가 ticket-1과 달라요 (${layout.ticket.w}×${layout.ticket.h}이어야 해요).`,
      );
    }
    if (ticket.rotation !== 0) bad(`ticket-${n}이 돌아가 있어요.`);
    if (!ticket.clipsContent) {
      issues.push({
        level: "warn",
        message: `ticket-${n}의 "내용 자르기"가 꺼져 있어요. 티켓 밖으로 나간 부분은 잘려요.`,
        nodeId: ticket.id,
      });
    }
    if (n === "1") {
      cornerRadius =
        ticket.cornerRadius === figma.mixed
          ? ticket.topLeftRadius
          : ticket.cornerRadius;
      const notch = ticket.children.find(
        (c) => c.name.trim() === "guide:notch",
      );
      notchRadius = notch ? Math.round(notch.width / 2) : 0;
    }

    const origin = originOf(ticket);
    const hide: SceneNode[] = [];
    const photos: {
      index: number;
      node: SceneNode;
      slot: DesignPhotoSlot | null;
    }[] = [];
    const texts: DesignText[] = [];
    const nStubTexts: DesignText[] = [];
    const textNodes: SceneNode[] = [];
    const stubNodes: SceneNode[] = [];

    for (const node of ticket.findAll(() => true)) {
      const parsed = parseLayerName(node.name);
      if (parsed.kind === "guide") hide.push(node);
      else if (parsed.kind === "suspicious") {
        issues.push({
          level: "warn",
          message: `"${node.name}": ${parsed.reason}. 지금은 그림으로 구워져요.`,
          nodeId: node.id,
        });
      } else if (parsed.kind === "photo") {
        hide.push(node);
        if (node.parent !== ticket) {
          issues.push({
            level: "error",
            message: `"${node.name}"을 그룹 밖, ticket-${n} 바로 아래로 빼 주세요.`,
            nodeId: node.id,
          });
          continue;
        }
        photos.push({
          index: parsed.index,
          node,
          slot: await readPhoto(node, origin, layout, issues),
        });
      } else if (parsed.kind === "text") {
        hide.push(node);
        const r = readText(node, parsed.bind, parsed.fallback, origin, issues);
        if (!r) continue;
        if (inRect(layout.stub, r.center.x, r.center.y)) {
          nStubTexts.push({
            ...r.text,
            x: r.text.x - layout.stub.x,
            y: r.text.y - layout.stub.y,
          });
          stubNodes.push(node);
        } else {
          texts.push({
            ...r.text,
            x: r.text.x - layout.body.x,
            y: r.text.y - layout.body.y,
          });
          textNodes.push(node);
        }
      }
    }

    // 사진 자리 번호 확인
    const count = Number(n);
    const indices = photos.map((p) => p.index).sort((a, b) => a - b);
    const expected = Array.from({ length: count }, (_, i) => i + 1);
    if (indices.join() !== expected.join()) {
      bad(
        `ticket-${n}에는 photo-1 ~ photo-${n}이 하나씩 있어야 해요 (지금: ${indices.map((i) => `photo-${i}`).join(", ") || "없음"}).`,
      );
    }
    const slots = expected.map(
      (i) => photos.find((p) => p.index === i)?.slot ?? null,
    );
    pathNodes.set(`body.${n}`, ticket);
    expected.forEach((i, k) => {
      const found = photos.find((p) => p.index === i);
      if (found) pathNodes.set(`body.${n}.photos.${k}`, found.node);
    });
    textNodes.forEach((t, k) => pathNodes.set(`body.${n}.texts.${k}`, t));
    if (n === "1") {
      pathNodes.set("stub", ticket);
      stubNodes.forEach((t, k) => pathNodes.set(`stub.texts.${k}`, t));
    }

    // 공동 쪽 글자는 ticket-1 것을 쓰고, 다른 판이 다르면 알려 줌
    if (n === "1") stubTexts = nStubTexts;
    else if (JSON.stringify(nStubTexts) !== JSON.stringify(stubTexts)) {
      issues.push({
        level: "warn",
        message: `ticket-${n}의 공동 쪽 글자가 ticket-1과 달라요. ticket-1 것을 써요.`,
        nodeId: ticket.id,
      });
    }

    // 그림 레이어를 사진 위·아래로 나눔 (ticket 바로 아래 레이어 기준)
    const hiddenIds = new Set(hide.map((h) => h.id));
    const art = ticket.children
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => !hiddenIds.has(c.id));
    const photoIdx = ticket.children
      .map((c, i) => (parseLayerName(c.name).kind === "photo" ? i : -1))
      .filter((i) => i >= 0);
    const split = photoIdx.length
      ? splitLayers(
          art.map(({ c, index }) => ({ id: c.id, index })),
          photoIdx,
        )
      : { under: art.map(({ c }) => c.id), over: [], between: [] };
    for (const id of split.between) {
      const node = ticket.children.find((c) => c.id === id);
      issues.push({
        level: "warn",
        message: `"${node?.name}"이 사진 자리 사이에 끼어 있어요. 앱에서는 사진 위로 올라가요.`,
        nodeId: id,
      });
    }
    const byId = (ids: string[]) =>
      ticket.children.filter((c) => ids.includes(c.id));
    const over = byId(split.over);
    const stubArea = layout.stub;
    for (const o of over) {
      const bb = o.absoluteBoundingBox;
      // 위 그림이 공동 쪽 자리와 겹치는지 (공동 쪽은 그림 한 장이라 위 그림이 없다)
      if (
        bb &&
        bb.x < origin.x + stubArea.x + stubArea.w &&
        bb.x + bb.width > origin.x + stubArea.x &&
        bb.y < origin.y + stubArea.y + stubArea.h &&
        bb.y + bb.height > origin.y + stubArea.y
      ) {
        issues.push({
          level: "warn",
          message: `"${o.name}"은 사진 위 그림인데 공동 쪽에 걸쳐 있어요. 공동 쪽 부분은 빠져요.`,
          nodeId: o.id,
        });
      }
    }

    // 저화질 그림은 막지는 않고 경고만 한다 (판단은 PR에서 팀장이)
    for (const node of [...byId(split.under), ...over]) {
      const targets: SceneNode[] =
        "findAll" in node ? [node, ...node.findAll(() => true)] : [node];
      for (const t of targets) {
        const scale = await imageUpscale(t);
        const key = `${t.name}:${Math.round((scale ?? 0) * 100)}`;
        if (
          scale !== null &&
          scale > MAX_IMAGE_UPSCALE &&
          !warnedImages.has(key)
        ) {
          warnedImages.add(key);
          issues.push({
            level: "warn",
            message: `ticket-${n}의 "${t.name}": ${lowResMessage(scale)}`,
            nodeId: t.id,
          });
        }
      }
    }

    plans.push({ ticket, hide, under: byId(split.under), over });
    if (slots.every((s): s is DesignPhotoSlot => s !== null)) {
      body[n] = { under: `body-${n}-under.webp`, photos: slots, texts };
      if (over.length) body[n].over = `body-${n}-over.webp`;
    }
  }

  if (!meta.id)
    issues.push({
      level: "error",
      message: "디자인 id를 적어 주세요 (영어 소문자·숫자·_).",
    });
  if (meta.tags.length === 0)
    issues.push({
      level: "error",
      message: "분위기 태그를 1~5개 골라 주세요.",
    });

  const candidate = {
    id: meta.id,
    name: meta.name,
    category,
    orientation,
    tags: meta.tags,
    mainColor: meta.mainColor,
    shape: { cornerRadius, notchRadius },
    stub: { image: "stub.webp", texts: stubTexts },
    body,
  };
  const parsed = designFileSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const e of parsed.error.issues) {
      const path = e.path.map(String);
      // 위에서 이미 이유를 알려 준 칸(id·태그 빈칸, 못 읽은 사진 판)은 같은 오류를 두 번 내지 않는다
      if (path[0] === "id" && !meta.id) continue;
      if (path[0] === "tags" && meta.tags.length === 0) continue;
      if (path[0] === "body" && path.length === 2 && !(path[1] in body))
        continue;
      let node: SceneNode | undefined;
      for (let len = path.length; len > 0 && !node; len--) {
        node = pathNodes.get(path.slice(0, len).join("."));
      }
      const ticket = node ? ticketOf(node) : null;
      const where = node
        ? ticket && ticket !== node
          ? `${ticket.name}의 "${node.name}"`
          : `"${node.name}"`
        : "디자인 정보";
      issues.push({
        level: "error",
        message: `${where}: ${e.message}`,
        nodeId: node?.id,
      });
    }
  }
  // 오류를 경고보다 먼저 보여 준다 (같은 등급 안에서는 찾은 순서 그대로)
  issues.sort(
    (x, y) => Number(x.level !== "error") - Number(y.level !== "error"),
  );
  return {
    issues,
    design: parsed.success ? parsed.data : null,
    plans,
    layout,
  };
}

// ─── 그림 내보내기 ───────────────────────────────────────

async function exportPng(node: FrameNode) {
  return node.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: 1 },
    useAbsoluteBounds: true,
  });
}

function ticketOf(node: SceneNode): FrameNode | null {
  let cur: BaseNode | null = node;
  while (cur && cur.type !== "PAGE") {
    if (cur.type === "FRAME" && /^ticket-\d$/.test(cur.name)) return cur;
    cur = cur.parent;
  }
  return null;
}

// 판 안에서의 위치(자식 순번 경로). 복사본에서 같은 레이어를 찾는 데 쓴다
function pathIn(root: FrameNode, node: SceneNode): number[] {
  const path: number[] = [];
  let cur: BaseNode = node;
  while (cur !== root && cur.parent) {
    const parent: BaseNode & ChildrenMixin = cur.parent;
    path.unshift(parent.children.findIndex((c) => c.id === cur.id));
    cur = parent;
  }
  return path;
}

function nodeAt(root: FrameNode, path: number[]): SceneNode | null {
  let cur: SceneNode = root;
  for (const i of path) {
    if (!("children" in cur)) return null;
    const next: SceneNode | undefined = cur.children[i];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

// 원본 레이어를 숨겼다 되돌리는 방식은 중간에 멈추거나 겹쳐 실행되면 숨긴 채로 남는다.
// 그래서 판을 복사해 필요 없는 레이어를 지우고 내보낸 뒤 복사본을 지운다
async function exportWithout(
  ticket: FrameNode,
  remove: SceneNode[],
  clearFill: boolean,
) {
  const paths = remove.map((r) => pathIn(ticket, r));
  const copy = ticket.clone();
  figma.currentPage.appendChild(copy);
  copy.x = ticket.absoluteTransform[0][2];
  copy.y = ticket.absoluteTransform[1][2] - ticket.height * 6;
  try {
    const targets = paths
      .map((p) => nodeAt(copy, p))
      .filter((t): t is SceneNode => t !== null);
    targets.forEach((t) => {
      if (!t.removed) t.remove();
    });
    if (clearFill) copy.fills = [];
    return await exportPng(copy);
  } finally {
    copy.remove();
  }
}

async function exportImages(plans: Plan[], layout: Layout) {
  const crop = (r: Rect): ImageJob["crop"] => [r.x, r.y, r.w, r.h];
  const sources: Record<string, Uint8Array> = {};
  const jobs: ImageJob[] = [];
  const stubSources: string[] = [];
  for (const p of plans) {
    const n = p.ticket.name.replace("ticket-", "");
    sources[`ticket-${n}-under`] = await exportWithout(
      p.ticket,
      [...p.hide, ...p.over],
      false,
    );
    stubSources.push(`ticket-${n}-under`);
    if (n === "1")
      jobs.push({
        file: "stub.webp",
        source: "ticket-1-under",
        crop: crop(layout.stub),
      });
    jobs.push({
      file: `body-${n}-under.webp`,
      source: `ticket-${n}-under`,
      crop: crop(layout.body),
    });

    if (p.over.length) {
      sources[`ticket-${n}-over`] = await exportWithout(
        p.ticket,
        [...p.hide, ...p.under],
        true,
      );
      jobs.push({
        file: `body-${n}-over.webp`,
        source: `ticket-${n}-over`,
        crop: crop(layout.body),
      });
    }
  }
  return { sources, jobs, stubSources };
}

// ─── 메시지 처리 ─────────────────────────────────────────

figma.on("selectionchange", sendSelection);
figma.on("currentpagechange", sendSelection);

let busy = false;

figma.ui.onmessage = async (msg: ToCode) => {
  if (msg.type === "image-prepared") {
    pendingImages.get(msg.id)?.(msg.result);
    pendingImages.delete(msg.id);
    return;
  }
  // 검사·내보내기가 도는 중에 다른 작업이 끼어들면 결과가 섞인다
  if (busy && msg.type !== "save-meta" && msg.type !== "focus") {
    return post({
      type: "notice",
      message: "이전 작업이 끝날 때까지 잠시 기다려 주세요.",
    });
  }
  busy = true;
  try {
    // 피그마는 플러그인 작업을 따로 표시하지 않으면 여러 동작을 Ctrl+Z 한 번에 같이 되돌린다
    if (msg.type === "create-blank") {
      await createBlank(msg.orientation);
      return figma.commitUndo();
    }
    if (msg.type === "apply-background") {
      await applyBackground();
      return figma.commitUndo();
    }
    if (msg.type === "assign") {
      assign(msg.role);
      return figma.commitUndo();
    }
    if (msg.type === "focus") {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && "visible" in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      return;
    }
    const frame = findDesignFrame(figma.currentPage.selection[0] ?? null);
    if (!frame)
      return post({
        type: "notice",
        message: "디자인(맨 바깥 프레임)이나 그 안의 레이어를 골라 주세요.",
      });
    if (msg.type === "save-meta") {
      frame.setPluginData(META, JSON.stringify(msg.meta));
      if (msg.meta.name) frame.name = `design:${msg.meta.name}`;
      return;
    }
    const { issues, design, plans, layout } = await convert(frame);
    if (
      msg.type === "check" ||
      !design ||
      issues.some((i) => i.level === "error")
    ) {
      return post({ type: "checked", issues, design });
    }
    const images = await exportImages(plans, layout);
    post({ type: "exported", issues, design, ...images });
  } catch (e) {
    post({
      type: "notice",
      message: `처리 중 오류가 났어요: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    busy = false;
  }
};

sendSelection();
