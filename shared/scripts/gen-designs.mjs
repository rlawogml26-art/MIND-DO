// 디자인 등록부를 디자인 폴더에서 자동으로 만든다 (`npm run build -w shared`가 먼저 실행).
// - shared/src/designs/registry.generated.ts: 디자인 JSON 목록 (서버·앱이 읽음)
// - frontend/src/designs/assets.generated.ts: 디자인 그림 목록 (앱은 그림을 이름으로 동적으로 불러올 수 없어서 import를 미리 적어 둔다)
// 두 파일 모두 생성물이라 커밋하지 않는다 (각 폴더 .gitignore).
// prettier는 하위 폴더 .gitignore를 읽지 않아서, CI의 format:check가 생성물도 검사한다. 그래서 정리해서 쓴다.
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const designsDir = join(root, "shared", "src", "designs");
const assetsDir = join(root, "frontend", "assets", "designs");
const sharedOut = join(designsDir, "registry.generated.ts");
const frontendOut = join(
  root,
  "frontend",
  "src",
  "designs",
  "assets.generated.ts",
);
// 루트 .prettierrc.json 기준으로 정리해서 쓴다
const writeFormatted = async (file, code) => {
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(code, { ...options, filepath: file }));
};
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const HEADER =
  "// 자동 생성 파일: shared/scripts/gen-designs.mjs. 직접 고치지 않는다.\n";

const designs = [];
for (const entry of readdirSync(designsDir).sort()) {
  const dir = join(designsDir, entry);
  if (!isDir(dir)) continue;
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith(".json"))
    .sort()) {
    // 읽을 수 없는 JSON은 건너뛴다. 어느 파일이 왜 틀렸는지는 check-designs가 알려 준다
    try {
      designs.push(JSON.parse(readFileSync(join(dir, f), "utf8")));
    } catch {
      continue;
    }
  }
}

await writeFormatted(
  sharedOut,
  `${HEADER}// 형식 검사는 registry.ts에서 한다.\nexport const DESIGN_FILE_DATA: readonly unknown[] = ${JSON.stringify(designs, null, 2)};\n`,
);

const imports = [];
const entries = [];
let n = 0;
if (isDir(assetsDir)) {
  for (const id of readdirSync(assetsDir).sort()) {
    if (!isDir(join(assetsDir, id))) continue;
    const files = readdirSync(join(assetsDir, id))
      .filter((f) => f.endsWith(".png"))
      .sort();
    const pairs = files.map((f) => {
      const name = `img${n++}`;
      imports.push(`import ${name} from "../../assets/designs/${id}/${f}";`);
      return `    ${JSON.stringify(f)}: ${name},`;
    });
    entries.push(`  ${JSON.stringify(id)}: {\n${pairs.join("\n")}\n  },`);
  }
}
mkdirSync(dirname(frontendOut), { recursive: true });
await writeFormatted(
  frontendOut,
  `${HEADER}import type { ImageSourcePropType } from "react-native";\n\n${imports.join("\n")}${imports.length ? "\n\n" : ""}// 디자인 id → 그림 파일 이름 → 앱 그림\nexport const DESIGN_ASSETS: Record<string, Record<string, ImageSourcePropType>> = {\n${entries.join("\n")}${entries.length ? "\n" : ""}};\n`,
);
process.stdout.write(
  `디자인 등록부 생성 (디자인 ${designs.length}개, 그림 ${n}개)\n`,
);
