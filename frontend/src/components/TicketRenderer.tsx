import {
  DESIGN_LAYOUTS,
  PHOTO_UPLOAD_MAX_COUNT,
  buildDrawList,
  findDesign,
  type DrawList,
  type DrawOp,
  type DrawText,
  type DesignPhotoSlot,
  type TicketTextValues,
} from "@mind-do/shared";
import {
  Canvas,
  FontWeight,
  Group,
  Image,
  Paragraph,
  PaintStyle,
  PathOp,
  Skia,
  TextAlign,
  useImage,
  type SkImage,
  type SkPath,
} from "@shopify/react-native-skia";
import { useMemo } from "react";

import { DESIGN_ASSETS } from "../designs/assets.generated";

// 개인 티켓 한 장(공동 쪽 + 개인 쪽)을 디자인 파일대로 그린다 (AGENTS.md "티켓 디자인").
// 무엇을 어디에 그릴지는 shared의 buildDrawList가 정하고, 여기서는 그 목록대로 칠하기만 한다.
// 캔버스 좌표(가로형 2000×800, 세로형 800×2000 px)를 화면 너비에 맞춰 줄여 그린다.

type TicketRendererProps = {
  designId: string;
  // 사용자 사진 (0번 = 대표 사진). 4장보다 많으면 앞의 4장만 쓴다
  photoUris: string[];
  values: TicketTextValues;
  width: number;
  // 세로형을 시계 방향으로 90도 눕혀 공동 쪽이 왼쪽에 오게 그린다 (일괄 보기, 11/18). 가로형에는 영향 없음
  lieDown?: boolean;
  part?: "stub" | "body";
};

// 글꼴 id → 기기 글꼴 이름.
// 후속 Issue #99: 앱에 넣을 글꼴 목록이 정해지면 useFonts로 글꼴 파일을 넣고 이 표를 바꾼다.
// 그 전까지는 기기 기본 글꼴로 그린다 (한글은 기기 글꼴이 자동으로 대신함)
const FONT_FAMILIES: Record<DrawText["style"]["font"], string[]> = {
  sans: ["sans-serif"],
  serif: ["serif"],
  script: ["sans-serif"],
  display: ["sans-serif"],
};

const TEXT_ALIGN: Record<DrawText["style"]["align"], TextAlign> = {
  left: TextAlign.Left,
  center: TextAlign.Center,
  right: TextAlign.Right,
};

const deg = (d: number) => (d * Math.PI) / 180;

function ticketClip(list: DrawList): SkPath {
  const outline = Skia.Path.RRect(
    Skia.RRectXY(
      Skia.XYWHRect(0, 0, list.width, list.height),
      list.cornerRadius,
      list.cornerRadius,
    ),
  );
  if (list.notchRadius <= 0) return outline;
  return list.notches.reduce(
    (path, n) =>
      Skia.Path.MakeFromOp(
        path,
        Skia.Path.Circle(n.x, n.y, list.notchRadius),
        PathOp.Difference,
      ) ?? path,
    outline,
  );
}

function photoClip(slot: DesignPhotoSlot): SkPath {
  const box = Skia.XYWHRect(slot.x, slot.y, slot.w, slot.h);
  if (slot.shape === "ellipse") return Skia.Path.Oval(box);
  if (slot.shape === "polygon" && slot.points) {
    return Skia.Path.Polygon(
      slot.points.map(([px, py]) =>
        Skia.Point(slot.x + px * slot.w, slot.y + py * slot.h),
      ),
      true,
    );
  }
  return Skia.Path.RRect(Skia.RRectXY(box, slot.radius, slot.radius));
}

function buildParagraph(op: DrawText, stroke: boolean) {
  const s = op.style;
  const builder = Skia.ParagraphBuilder.Make({
    maxLines: s.maxLines,
    ellipsis: "…",
    textAlign: TEXT_ALIGN[s.align],
  });
  const textStyle = {
    color: Skia.Color(s.color),
    fontFamilies: FONT_FAMILIES[s.font],
    fontSize: s.size,
    fontStyle: {
      weight: s.weight === "bold" ? FontWeight.Bold : FontWeight.Normal,
    },
    letterSpacing: s.letterSpacing,
    shadows:
      !stroke && s.shadow
        ? [
            {
              color: Skia.Color(s.shadow.color),
              offset: { x: s.shadow.dx, y: s.shadow.dy },
              blurRadius: 0,
            },
          ]
        : [],
  };
  if (stroke && s.stroke) {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(s.stroke.width * 2);
    paint.setColor(Skia.Color(s.stroke.color));
    builder.pushStyle(textStyle, paint);
  } else {
    builder.pushStyle(textStyle);
  }
  const paragraph = builder.addText(op.text).build();
  paragraph.layout(s.w);
  return paragraph;
}

function TextOp({ op }: { op: DrawText }) {
  const s = op.style;
  const fill = useMemo(() => buildParagraph(op, false), [op]);
  const outline = useMemo(
    () => (s.stroke ? buildParagraph(op, true) : null),
    [op, s.stroke],
  );
  // 칸(x·y·w·h)은 돌리기 전 상자이고, 칸 가운데를 기준으로 돌린다 (피그마 플러그인과 같은 기준).
  // 테두리·그림자가 칸 밖으로 조금 나가도 잘리지 않게 자르지 않는다. 줄 수는 maxLines가 막는다
  return (
    <Group
      origin={{ x: s.x + s.w / 2, y: s.y + s.h / 2 }}
      transform={[{ rotate: deg(s.rotate) }]}
    >
      {outline && <Paragraph paragraph={outline} x={s.x} y={s.y} width={s.w} />}
      <Paragraph paragraph={fill} x={s.x} y={s.y} width={s.w} />
    </Group>
  );
}

function PhotoOp({
  slot,
  image,
}: {
  slot: DesignPhotoSlot;
  image: SkImage | null;
}) {
  const clip = useMemo(() => photoClip(slot), [slot]);
  return (
    <Group
      origin={{ x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 }}
      transform={[{ rotate: deg(slot.rotate) }]}
      clip={clip}
    >
      {image && (
        <Image
          image={image}
          x={slot.x}
          y={slot.y}
          width={slot.w}
          height={slot.h}
          fit="cover"
        />
      )}
    </Group>
  );
}

// 앱 그림은 숫자(번들 모듈)로 들어온다. 다른 형태면 그리지 않는다
const assetSource = (designId: string, file: string | undefined) => {
  const src = file ? DESIGN_ASSETS[designId]?.[file] : undefined;
  return typeof src === "number" ? src : null;
};

export default function TicketRenderer({
  designId,
  photoUris,
  values,
  width,
  lieDown = false,
  part,
}: TicketRendererProps) {
  const design = findDesign(designId);
  const photoCount = Math.min(
    Math.max(photoUris.length, 1),
    PHOTO_UPLOAD_MAX_COUNT,
  );
  // 부르는 쪽이 매번 새 values 객체를 넘겨도 내용이 같으면 다시 계산하지 않는다 (일괄 보기에서 여러 장을 그림)
  const valuesKey = JSON.stringify(values);
  const list = useMemo(
    () => (design ? buildDrawList(design, photoCount, values) : null),
    [design, photoCount, valuesKey],
  );
  const images = list?.ops.filter((o) => o.kind === "image") ?? [];

  // 훅 개수가 바뀌지 않도록 그림 3칸(공동 쪽·아래·위) + 사진 4칸(PHOTO_UPLOAD_MAX_COUNT)을 늘 부른다
  const stubImg = useImage(assetSource(designId, images[0]?.file));
  const showBody = part !== "stub";
  const underImg = useImage(
    showBody ? assetSource(designId, images[1]?.file) : null,
  );
  const overImg = useImage(
    showBody ? assetSource(designId, images[2]?.file) : null,
  );
  const p0 = useImage(showBody ? (photoUris[0] ?? null) : null);
  const p1 = useImage(showBody ? (photoUris[1] ?? null) : null);
  const p2 = useImage(showBody ? (photoUris[2] ?? null) : null);
  const p3 = useImage(showBody ? (photoUris[3] ?? null) : null);

  const clip = useMemo(() => (list ? ticketClip(list) : null), [list]);

  if (!list || !clip) return null;

  const rotated = lieDown && list.orientation === "vertical";
  // 눕히면 화면에서 가로·세로가 바뀐다
  const region = part
    ? DESIGN_LAYOUTS[list.orientation][part]
    : { x: 0, y: 0, w: list.width, h: list.height };
  const shownW = rotated ? region.h : region.w;
  const shownH = rotated ? region.w : region.h;
  const scale = width / shownW;
  const offsetX = rotated ? list.height - region.y - region.h : region.x;
  const offsetY = rotated ? region.x : region.y;
  // 시계 방향 90도: (x, y) → (높이 - y, x). 아래쪽 공동 쪽이 왼쪽으로 온다
  const transform = rotated
    ? [{ scale }, { translateX: list.height }, { rotate: Math.PI / 2 }]
    : [{ scale }];
  const photoImages = [p0, p1, p2, p3];
  const imageByFile = new Map<string, SkImage | null>([
    [images[0]?.file ?? "", stubImg],
    [images[1]?.file ?? "", underImg],
    [images[2]?.file ?? "", overImg],
  ]);

  const render = (op: DrawOp, i: number) => {
    switch (op.kind) {
      case "image": {
        const img = imageByFile.get(op.file) ?? null;
        return img ? (
          <Image
            key={i}
            image={img}
            x={op.x}
            y={op.y}
            width={op.w}
            height={op.h}
            fit="fill"
          />
        ) : null;
      }
      case "photo":
        return (
          <PhotoOp
            key={i}
            slot={op.slot}
            image={photoImages[op.photoIndex] ?? null}
          />
        );
      case "text":
        return <TextOp key={i} op={op} />;
    }
  };

  return (
    <Canvas style={{ width, height: shownH * scale }}>
      <Group
        transform={[
          { translateX: -offsetX * scale },
          { translateY: -offsetY * scale },
        ]}
      >
        <Group transform={transform}>
          <Group clip={clip}>{list.ops.map(render)}</Group>
        </Group>
      </Group>
    </Canvas>
  );
}
