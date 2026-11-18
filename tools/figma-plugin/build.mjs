// 피그마 플러그인은 코드 파일 하나(code.js)와 창 파일 하나(ui.html)만 읽어서,
// 각각 의존성까지 한 파일로 묶는다.
import { build, context } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const watch = process.argv.includes("--watch");
await mkdir("dist", { recursive: true });

const codeOptions = {
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  format: "iife",
  // 피그마 플러그인 실행 환경이 최신 문법을 다 지원하지 않아 낮춰서 묶는다
  target: "es2017",
  // 피그마는 코드에 `import(` 글자가 주석으로라도 있으면 실행을 거부한다 (zod 주석에 있음).
  // 줄이기로 주석을 지우고, 그래도 남았는지 빌드 후 검사한다.
  minify: true,
  logLevel: "info",
};

async function checkCode() {
  const code = await readFile("dist/code.js", "utf8");
  if (/\bimport\s*\(/.test(code)) {
    throw new Error(
      "dist/code.js에 `import(` 글자가 있어 피그마가 실행을 거부합니다.",
    );
  }
}

async function buildUi() {
  const result = await build({
    entryPoints: ["src/ui.ts"],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
  });
  const template = await readFile("src/ui.html", "utf8");
  const script = result.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
  // 문자열로 넘기면 코드 안의 `$&` 등을 치환 기호로 해석해 코드가 깨진다. 함수로 넘긴다.
  await writeFile(
    "dist/ui.html",
    template.replace("<!-- UI_SCRIPT -->", () => `<script>${script}</script>`),
  );
}

if (watch) {
  const ctx = await context(codeOptions);
  await ctx.watch();
  const uiCtx = await context({
    entryPoints: ["src/ui.ts", "src/ui.html"],
    bundle: false,
    write: false,
    plugins: [{ name: "ui", setup: (b) => b.onEnd(() => buildUi()) }],
    loader: { ".html": "text" },
  });
  await uiCtx.watch();
} else {
  await build(codeOptions);
  await checkCode();
  await buildUi();
}
