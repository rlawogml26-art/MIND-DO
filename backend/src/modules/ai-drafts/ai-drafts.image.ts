import sharp from "sharp";
import type { AiDraftsConfig } from "./ai-drafts.config.js";
import {
  PHOTO_COLOR_MAX_LIGHTNESS,
  PHOTO_COLOR_MIN_CHROMA,
  PHOTO_COLOR_MIN_LIGHTNESS,
} from "./ai-drafts.catalog.js";

// AI에 보낼 사진 준비 (AGENTS.md "AI 초안": 분석용 축소 사본, 티켓에는 원본을 쓴다)
// 서버 메모리가 작으므로(t4g.micro) 여러 장이면 부르는 쪽에서 한 장씩 순서대로 처리한다.

export type PreparedPhoto = {
  jpeg: Buffer; // 긴 변 imageMaxSide 이하 JPEG
  colors: string[]; // 주요 색 #RRGGBB, 많은 순 (AI 프롬프트용)
  accentColors: string[]; // 배경색 후보. 회색·검정·흰색을 빼고 "많고 진한" 순
};

// 색을 셀 때 채널마다 앞 몇 비트만 본다 (4비트 = 채널당 16단계, 비슷한 색을 하나로 묶음)
const COLOR_BIN_BITS = 4;
const COLOR_BIN_SHIFT = 8 - COLOR_BIN_BITS;

export async function preparePhoto(
  input: Buffer,
  config: Pick<
    AiDraftsConfig,
    "imageMaxSide" | "imageJpegQuality" | "colorsPerPhoto"
  >,
): Promise<PreparedPhoto> {
  const resized = sharp(input).rotate().resize({
    width: config.imageMaxSide,
    height: config.imageMaxSide,
    fit: "inside",
    withoutEnlargement: true,
  });

  const jpeg = await resized
    .clone()
    .jpeg({ quality: config.imageJpegQuality })
    .toBuffer();
  const { data, info } = await resized
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = countColors(data, info.channels);
  return {
    jpeg,
    colors: [...bins]
      .sort((a, b) => b.n - a.n)
      .slice(0, config.colorsPerPhoto)
      .map((c) => c.hex),
    accentColors: bins
      .filter(
        (c) =>
          c.chroma >= PHOTO_COLOR_MIN_CHROMA &&
          c.lightness >= PHOTO_COLOR_MIN_LIGHTNESS &&
          c.lightness <= PHOTO_COLOR_MAX_LIGHTNESS,
      )
      .sort((a, b) => b.n * b.chroma - a.n * a.chroma)
      .slice(0, config.colorsPerPhoto)
      .map((c) => c.hex),
  };
}

type ColorBin = { hex: string; n: number; chroma: number; lightness: number };

function countColors(pixels: Buffer, channels: number): ColorBin[] {
  const bins = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();
  for (let i = 0; i + 2 < pixels.length; i += channels) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const key =
      ((r >> COLOR_BIN_SHIFT) << (COLOR_BIN_BITS * 2)) |
      ((g >> COLOR_BIN_SHIFT) << COLOR_BIN_BITS) |
      (b >> COLOR_BIN_SHIFT);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  return [...bins.values()].map((bin) => {
    const r = Math.round(bin.r / bin.n);
    const g = Math.round(bin.g / bin.n);
    const b = Math.round(bin.b / bin.n);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return {
      hex: toHex(r, g, b),
      n: bin.n,
      chroma: ((max - min) / 255) * 100,
      lightness: ((max + min) / 2 / 255) * 100,
    };
  });
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
