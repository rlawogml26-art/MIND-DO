import {
  DESIGN_LAYOUTS,
  DESIGN_PHOTO_COUNTS,
  DESIGN_TEXT_BINDS,
  MOOD_TAGS,
  type DesignFile,
  type MoodTag,
} from "@mind-do/shared";
import JSZip from "jszip";
import { removeFlatBackground } from "./lib/background";
import type {
  AssignRole,
  ImageJob,
  Issue,
  Meta,
  PreparedImage,
  ToCode,
  ToUi,
} from "./lib/messages";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const send = (msg: ToCode) => parent.postMessage({ pluginMessage: msg }, "*");
const notice = (text: string) => ($("notice").textContent = text);

let meta: Meta | null = null;

// 분위기 태그 체크박스
const tagBox = $("tags");
for (const tag of MOOD_TAGS) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = tag;
  label.append(input, tag);
  tagBox.append(label);
}

function readForm(): Meta {
  const tags = [
    ...tagBox.querySelectorAll<HTMLInputElement>("input:checked"),
  ].map((i) => i.value as MoodTag);
  return {
    name: $<HTMLInputElement>("name").value.trim(),
    id: $<HTMLInputElement>("id").value.trim(),
    mainColor: $<HTMLInputElement>("mainColor").value.toUpperCase(),
    tags,
  };
}

let saveTimer = 0;
function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    meta = readForm();
    send({ type: "save-meta", meta });
  }, 300);
}
for (const id of ["name", "id", "mainColor"])
  $(id).addEventListener("input", saveSoon);
tagBox.addEventListener("change", (e) => {
  const checked = tagBox.querySelectorAll("input:checked");
  if (checked.length > 5) {
    (e.target as HTMLInputElement).checked = false;
    notice("분위기 태그는 5개까지 고를 수 있어요.");
    return;
  }
  saveSoon();
});

function fillForm(m: Meta, category: string | null, pageName: string) {
  $<HTMLInputElement>("name").value = m.name;
  $<HTMLInputElement>("id").value = m.id;
  $<HTMLInputElement>("mainColor").value = m.mainColor.toLowerCase();
  tagBox
    .querySelectorAll<HTMLInputElement>("input")
    .forEach((i) => (i.checked = m.tags.includes(i.value as MoodTag)));
  $("category").textContent = category ?? `없음 (페이지 "${pageName}")`;
}

function showIssues(issues: Issue[]) {
  const list = $("issues");
  list.replaceChildren(
    ...issues.map((i) => {
      const li = document.createElement("li");
      li.className = i.level;
      li.innerHTML = `<b>${i.level === "error" ? "오류" : "경고"}</b> `;
      li.append(i.message);
      if (i.nodeId)
        li.addEventListener("click", () =>
          send({ type: "focus", nodeId: i.nodeId as string }),
        );
      return li;
    }),
  );
}

$("blank").addEventListener("click", () =>
  send({ type: "create-blank", orientation: "horizontal" }),
);
$("blank-vertical").addEventListener("click", () =>
  send({ type: "create-blank", orientation: "vertical" }),
);
$("background").addEventListener("click", () =>
  send({ type: "apply-background" }),
);
$("check").addEventListener("click", () => {
  notice("검사하는 중…");
  send({ type: "check" });
});
$("export").addEventListener("click", () => {
  notice("그림을 만드는 중…");
  send({ type: "export" });
});
function toAssignRole(v: string | undefined): AssignRole | undefined {
  if (v === "photo") return v;
  return DESIGN_TEXT_BINDS.find((b) => b === v);
}

document.querySelectorAll<HTMLButtonElement>("[data-role]").forEach((b) =>
  b.addEventListener("click", () => {
    const role = toAssignRole(b.dataset.role);
    if (role) send({ type: "assign", role });
  }),
);

// ─── 그림 자르기·묶기 ────────────────────────────────────

async function decode(bytes: Uint8Array) {
  return createImageBitmap(
    new Blob([bytes as BlobPart], { type: "image/png" }),
  );
}

function cropCanvas(img: ImageBitmap, [x, y, w, h]: ImageJob["crop"]) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 자를 수 없어요");
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return { canvas, ctx };
}

// 내보내는 그림 품질 (0~1). 0.9면 눈으로 차이가 거의 없고, PNG보다 몇 배~수십 배 작다
const WEBP_QUALITY = 0.9;

const toWebp = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        // WebP를 못 만드는 환경은 PNG로 바꿔 주므로, 파일 이름(.webp)과 내용이 어긋나지 않게 막는다
        b && b.type === "image/webp"
          ? resolve(b)
          : reject(new Error("WebP 변환 실패")),
      "image/webp",
      WEBP_QUALITY,
    ),
  );

// 같은 그림인지 보려고 픽셀 전체로 지문을 만든다 (FNV-1a)
function fingerprint(img: ImageData) {
  let h = 0x811c9dc5;
  for (let i = 0; i < img.data.length; i++) {
    h ^= img.data[i];
    h = Math.imul(h, 0x01000193);
  }
  return `${img.width}x${img.height}:${h >>> 0}`;
}

function sameStub(a: ImageData, b: ImageData) {
  if (a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++)
    if (Math.abs(a.data[i] - b.data[i]) > 2) return false;
  return true;
}

async function buildZip(
  design: DesignFile,
  sources: Record<string, Uint8Array>,
  jobs: ImageJob[],
  stubSources: string[],
) {
  const decoded = new Map<string, ImageBitmap>();
  for (const [key, bytes] of Object.entries(sources))
    decoded.set(key, await decode(bytes));

  // 공동 쪽 그림이 판마다 다르면 알려 줌 (ticket-1 것을 씀)
  const warnings: string[] = [];
  const stub = DESIGN_LAYOUTS[design.orientation].stub;
  const stubOf = (key: string) =>
    cropCanvas(decoded.get(key) as ImageBitmap, [
      stub.x,
      stub.y,
      stub.w,
      stub.h,
    ]).ctx.getImageData(0, 0, stub.w, stub.h);
  const first = stubOf(stubSources[0]);
  stubSources.slice(1).forEach((key) => {
    if (!sameStub(first, stubOf(key)))
      warnings.push(
        `${key.replace("-under", "")}의 공동 쪽 그림이 ticket-1과 달라요. ticket-1 것을 써요.`,
      );
  });

  const zip = new JSZip();
  // 사진 수별 판의 그림이 같으면 한 파일만 넣고 디자인 파일이 그 파일을 가리키게 한다 (앱 용량)
  const byPrint = new Map<string, string>();
  const rename = new Map<string, string>();
  for (const job of jobs) {
    const { canvas, ctx } = cropCanvas(
      decoded.get(job.source) as ImageBitmap,
      job.crop,
    );
    const print = fingerprint(
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    );
    const same = byPrint.get(print);
    if (same) {
      rename.set(job.file, same);
      continue;
    }
    byPrint.set(print, job.file);
    zip.file(
      `frontend/assets/designs/${design.id}/${job.file}`,
      await toWebp(canvas),
    );
  }
  const fileOf = (f: string) => rename.get(f) ?? f;
  const body = { ...design.body };
  for (const n of DESIGN_PHOTO_COUNTS) {
    const v = design.body[n];
    body[n] = {
      ...v,
      under: fileOf(v.under),
      ...(v.over ? { over: fileOf(v.over) } : {}),
    };
  }
  const out: DesignFile = {
    ...design,
    stub: { ...design.stub, image: fileOf(design.stub.image) },
    body,
  };
  const json = JSON.stringify(out, null, 2) + "\n";
  zip.file(`shared/src/designs/${design.category}/${design.id}.json`, json);
  return { blob: await zip.generateAsync({ type: "blob" }), warnings };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function prepareImage(bytes: Uint8Array): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const result = removeFlatBackground(image.data, image.width, image.height);
  if (result.status !== "removed") return { ...result, bytes: null };
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/png"),
  );
  if (!blob) throw new Error("png");
  return { ...result, bytes: new Uint8Array(await blob.arrayBuffer()) };
}

window.onmessage = async (event: MessageEvent<{ pluginMessage?: ToUi }>) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;
  if (msg.type === "prepare-image") {
    const result = await prepareImage(msg.bytes).catch((): PreparedImage => ({
      status: "failed",
      box: null,
      bytes: null,
      removedPercent: 0,
    }));
    return send({ type: "image-prepared", id: msg.id, result });
  }
  if (msg.type === "notice") return notice(msg.message);
  if (msg.type === "selection") {
    const isDesign = msg.state.status === "design";
    $("form").hidden = !isDesign;
    $("none").hidden = isDesign;
    if (msg.state.status === "design") {
      meta = msg.state.meta;
      fillForm(meta, msg.state.category, msg.state.pageName);
    }
    return;
  }
  if (msg.type === "checked") {
    showIssues(msg.issues);
    const errors = msg.issues.filter((i) => i.level === "error").length;
    notice(
      errors
        ? `오류 ${errors}개를 고쳐야 내보낼 수 있어요.`
        : "검사를 통과했어요.",
    );
    return;
  }
  if (msg.type === "exported") {
    try {
      const { blob, warnings } = await buildZip(
        msg.design,
        msg.sources,
        msg.jobs,
        msg.stubSources,
      );
      showIssues([
        ...msg.issues,
        ...warnings.map((m): Issue => ({ level: "warn", message: m })),
      ]);
      download(blob, `${msg.design.id}.zip`);
      notice(
        `${msg.design.id}.zip을 내려받았어요. 레포 맨 위에서 압축을 풀고 npm run format 후 PR을 올려 주세요.`,
      );
    } catch (e) {
      notice(
        `내보내기에 실패했어요: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
};
