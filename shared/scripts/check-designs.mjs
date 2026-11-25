// 티켓 디자인 파일 자동 검사 (CI가 `npm run typecheck`에서 실행).
// 형식(zod)은 플러그인도 검사하지만, 손으로 고친 파일이나 그림 누락은 여기서만 잡힌다.
// 빌드된 shared(dist)를 쓰므로 shared를 고쳤으면 먼저 `npm run build -w shared`.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  DESIGN_CATEGORIES,
  DESIGN_LAYOUTS,
  DESIGN_PHOTO_COUNTS,
  designFileSchema,
} from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const designsDir = join(root, "shared", "src", "designs");
const assetsDir = join(root, "frontend", "assets", "designs");
const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);
const rel = (p) => p.slice(root.length + 1);

// 그림 머리에서 가로·세로를 읽는다 (PNG·WebP). 패키지를 늘리지 않으려고 직접 읽음
function imageSize(file) {
  const b = readFileSync(file);
  if (b.length >= 24 && b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a")
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (
    b.length < 30 ||
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WEBP"
  )
    return null;
  const chunk = b.toString("ascii", 12, 16);
  // 손실 압축
  if (chunk === "VP8 ")
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  // 무손실 압축: 14비트씩 (값 - 1)
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  // 투명도가 있는 손실 압축 등: 24비트씩 (값 - 1)
  if (chunk === "VP8X")
    return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  return null;
}

function checkImage(id, name, size, owner) {
  const file = join(assetsDir, id, name);
  if (!existsSync(file)) return fail(owner, `그림이 없습니다: ${rel(file)}`);
  const got = imageSize(file);
  if (!got) return fail(owner, `PNG·WebP 그림이 아닙니다: ${rel(file)}`);
  if (got.w !== size.w || got.h !== size.h) {
    fail(
      owner,
      `${name} 크기가 ${got.w}×${got.h}입니다 (${size.w}×${size.h}이어야 함)`,
    );
  }
}

const seen = new Set();
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

for (const entry of readdirSync(designsDir)) {
  const dir = join(designsDir, entry);
  if (!isDir(dir)) continue;
  const jsons = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (!DESIGN_CATEGORIES.includes(entry)) {
    for (const f of jsons)
      fail(
        rel(join(dir, f)),
        `"${entry}"는 카테고리 폴더가 아닙니다 (${DESIGN_CATEGORIES.join(", ")})`,
      );
    continue;
  }
  for (const f of jsons) {
    const file = join(dir, f);
    const owner = rel(file);
    let raw;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      fail(owner, "JSON으로 읽을 수 없습니다");
      continue;
    }
    const parsed = designFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const i of parsed.error.issues)
        fail(owner, `${i.path.join(".") || "(전체)"}: ${i.message}`);
      // 형식이 틀려도 그림 폴더 짝은 맞는 것으로 봐서, "디자인 파일이 없다"는 엉뚱한 오류를 덧붙이지 않는다
      if (raw && typeof raw === "object" && typeof raw.id === "string")
        seen.add(raw.id);
      continue;
    }
    const d = parsed.data;
    const stem = basename(f, ".json");
    if (d.id !== stem)
      fail(owner, `파일 이름(${stem})과 id(${d.id})가 다릅니다`);
    if (d.category !== entry)
      fail(owner, `폴더(${entry})와 category(${d.category})가 다릅니다`);
    if (seen.has(d.id)) fail(owner, `id ${d.id}가 겹칩니다`);
    seen.add(d.id);

    const layout = DESIGN_LAYOUTS[d.orientation];
    checkImage(d.id, d.stub.image, layout.stub, owner);
    for (const n of DESIGN_PHOTO_COUNTS) {
      checkImage(d.id, d.body[n].under, layout.body, owner);
      if (d.body[n].over) checkImage(d.id, d.body[n].over, layout.body, owner);
    }
    // 디자인 파일이 쓰지 않는 그림 (다시 내보낼 때 예전 그림이 남은 경우). 앱 용량만 늘린다
    const used = new Set([
      d.stub.image,
      ...DESIGN_PHOTO_COUNTS.flatMap((n) =>
        [d.body[n].under, d.body[n].over].filter(Boolean),
      ),
    ]);
    const assetDir = join(assetsDir, d.id);
    if (isDir(assetDir)) {
      for (const f of readdirSync(assetDir)) {
        if (!used.has(f))
          fail(
            owner,
            `디자인 파일이 쓰지 않는 그림입니다. 지워 주세요: ${rel(join(assetDir, f))}`,
          );
      }
    }
  }
}

// 디자인 파일 없이 그림 폴더만 남은 경우 (디자인을 지우고 그림을 안 지움)
if (isDir(assetsDir)) {
  for (const id of readdirSync(assetsDir)) {
    if (isDir(join(assetsDir, id)) && !seen.has(id)) {
      fail(
        rel(join(assetsDir, id)),
        "이 그림 폴더에 맞는 디자인 파일이 없습니다",
      );
    }
  }
}

if (errors.length) {
  process.stderr.write(`티켓 디자인 검사 실패 (${errors.length}건)\n`);
  for (const e of errors) process.stderr.write(`- ${e}\n`);
  process.exit(1);
}
process.stdout.write(`티켓 디자인 검사 통과 (${seen.size}개)\n`);
