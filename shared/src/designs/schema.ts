import { z } from "zod";
import { moodTagSchema } from "../mood-tags.js";
import {
  DESIGN_CATEGORIES,
  DESIGN_FONT_IDS,
  DESIGN_LAYOUTS,
  DESIGN_ORIENTATIONS,
  DESIGN_PHOTO_COUNTS,
  DESIGN_PHOTO_SHAPES,
  DESIGN_STUB_TEXT_COUNTS,
  DESIGN_TEXT_BINDS,
} from "./constants.js";

// 티켓 디자인 파일 형식 (굽기 방식, 11/16).
// 배경·장식은 그림(WebP, 예전에 내보낸 PNG도 읽음)으로 굽고, 사람마다 바뀌는 사진 칸과 글자 칸만 값으로 둔다.
// 그리는 순서: 아래 그림 → 사진 → 위 그림 → 글자.

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const imageFile = z.string().regex(/^[a-z0-9_-]+\.(webp|png)$/);
const box = {
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().positive(),
  h: z.number().positive(),
};
type Box = { x: number; y: number; w: number; h: number };
// 세운 글자(90°·-90°)는 가운데 기준으로 돌린 뒤의 상자로 캔버스 안인지 본다
const shownBox = (t: Box & { rotate: number }): Box =>
  t.rotate === 0
    ? t
    : {
        x: t.x + t.w / 2 - t.h / 2,
        y: t.y + t.h / 2 - t.w / 2,
        w: t.h,
        h: t.w,
      };
const STUB_TEXT_LABELS: Record<string, string> = {
  date: "날짜",
  groupName: "그룹명",
  participants: "참여자",
  title: "제목",
};

export const designPhotoSlotSchema = z
  .object({
    ...box,
    shape: z.enum(DESIGN_PHOTO_SHAPES).default("rect"),
    // polygon 꼭짓점. 칸 안에서의 비율(0~1)
    points: z
      .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
      .min(3)
      .max(64)
      .optional(),
    radius: z.number().min(0).default(0),
    // 칸 가운데를 기준으로 시계 방향 각도
    rotate: z.number().min(-45).max(45).default(0),
  })
  .refine((p) => (p.shape === "polygon") === (p.points !== undefined), {
    message: "polygon일 때만 points가 있어야 합니다",
  });

export const designTextSchema = z
  .object({
    bind: z.enum(DESIGN_TEXT_BINDS),
    value: z.string().max(30).optional(),
    // 공동 티켓 값이 비었을 때 대신 쓰는 문구 (예: 제목 없음)
    fallback: z.string().max(30).optional(),
    // 칸은 돌리기 전 상자다. 90°·-90°로 세운 글자는 돌리기 전 상자가 캔버스 밖으로 나갈 수 있어서
    // x·y의 아래 한계를 두지 않고, 캔버스 안에 있는지는 돌린 뒤 모양으로 검사한다 (아래 inside)
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    font: z.enum(DESIGN_FONT_IDS),
    size: z.number().min(16).max(240),
    weight: z.enum(["regular", "bold"]).default("regular"),
    color: hex,
    align: z.enum(["left", "center", "right"]).default("left"),
    rotate: z.union([z.literal(0), z.literal(90), z.literal(-90)]).default(0),
    maxLines: z.number().int().min(1).max(3).default(1),
    letterSpacing: z.number().min(-20).max(60).default(0),
    // 디자이너가 정한 기본 효과. 사용자가 꾸미기에서 켜고 끌 수 있다 (꾸미기 기능 때)
    stroke: z
      .object({ color: hex, width: z.number().min(1).max(20) })
      .optional(),
    shadow: z
      .object({
        color: hex,
        dx: z.number().min(-40).max(40),
        dy: z.number().min(-40).max(40),
      })
      .optional(),
  })
  .refine((t) => t.bind !== "static" || !!t.value, {
    message: "static 글자는 value가 필요합니다",
  });

export const designBodyVariantSchema = z.object({
  under: imageFile,
  over: imageFile.optional(),
  photos: z.array(designPhotoSlotSchema),
  texts: z.array(designTextSchema).max(12).default([]),
});

export const designFileSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1).max(20),
    category: z.enum(DESIGN_CATEGORIES),
    // 선택 칸이라 방향이 없는 기존 디자인 파일은 가로형으로 읽힌다
    orientation: z.enum(DESIGN_ORIENTATIONS).default("horizontal"),
    tags: z.array(moodTagSchema).min(1).max(5),
    // 사진 색과 어울리는지 코드가 비교하는 대표 색
    mainColor: hex,
    // 사진이 티켓 밖으로 나가지 않게 자르는 바깥 모양
    shape: z.object({
      cornerRadius: z.number().min(0).max(80).default(24),
      notchRadius: z.number().min(0).max(60).default(0),
    }),
    stub: z.object({
      image: imageFile,
      texts: z.array(designTextSchema).max(12).default([]),
    }),
    body: z.object({
      "1": designBodyVariantSchema,
      "2": designBodyVariantSchema,
      "3": designBodyVariantSchema,
      "4": designBodyVariantSchema,
    }),
  })
  .superRefine((d, ctx) => {
    const layout = DESIGN_LAYOUTS[d.orientation];
    // id 규칙을 형식에 두어 플러그인 [검사]와 CI가 같은 기준으로 막는다 (11/18)
    if (!new RegExp(`^${d.category}_[a-z0-9_]+_[0-9]+$`).test(d.id)) {
      ctx.addIssue({
        code: "custom",
        message: `id는 <카테고리>_<디자인 이름>_<번호> 형식이어야 합니다 (예: ${d.category}_sunset_01)`,
        path: ["id"],
      });
    }
    // path를 함께 넣어야 검사 도구(피그마 플러그인, CI)가 어느 칸인지 짚을 수 있다
    const inside = (
      b: Box,
      size: { w: number; h: number },
      area: string,
      path: (string | number)[],
    ) => {
      if (
        b.x < -0.5 ||
        b.y < -0.5 ||
        b.x + b.w > size.w + 0.5 ||
        b.y + b.h > size.h + 0.5
      ) {
        ctx.addIssue({
          code: "custom",
          message: `${area}(${size.w}×${size.h}) 밖으로 나갔습니다`,
          path,
        });
      }
    };
    d.stub.texts.forEach((t, i) =>
      inside(shownBox(t), layout.stub, "공동 쪽", ["stub", "texts", i]),
    );
    for (const [bind, { min, max }] of Object.entries(
      DESIGN_STUB_TEXT_COUNTS,
    )) {
      const count = d.stub.texts.filter((t) => t.bind === bind).length;
      if (count < min || count > max) {
        const want = min === max ? `${min}개` : `${min}~${max}개`;
        ctx.addIssue({
          code: "custom",
          message: `공동 쪽에 ${STUB_TEXT_LABELS[bind] ?? bind} 글자 칸이 ${want} 있어야 합니다 (지금 ${count}개)`,
          path: ["stub", "texts"],
        });
      }
    }
    for (const n of DESIGN_PHOTO_COUNTS) {
      const v = d.body[n];
      if (v.photos.length !== Number(n)) {
        ctx.addIssue({
          code: "custom",
          message: `사진 ${n}장 판에는 사진 칸이 ${n}개여야 합니다 (지금 ${v.photos.length}개)`,
          path: ["body", n, "photos"],
        });
      }
      v.photos.forEach((p, i) =>
        inside(p, layout.body, "개인 쪽", ["body", n, "photos", i]),
      );
      // 대표 사진(1번)이 가장 작은 칸이면 안 된다 (11/18). 다른 칸과 같거나 큰 칸이 하나라도 있으면 됨
      const [main, ...rest] = v.photos;
      if (main && rest.length > 0) {
        const area = (p: Box) => p.w * p.h;
        if (rest.every((p) => area(main) < area(p))) {
          ctx.addIssue({
            code: "custom",
            message:
              "대표 사진(1번) 칸이 가장 작습니다. 다른 칸 중 하나보다는 크거나 같아야 합니다",
            path: ["body", n, "photos", 0],
          });
        }
      }
      v.texts.forEach((t, i) =>
        inside(shownBox(t), layout.body, "개인 쪽", ["body", n, "texts", i]),
      );
    }
  });

export type DesignPhotoSlot = z.infer<typeof designPhotoSlotSchema>;
export type DesignText = z.infer<typeof designTextSchema>;
export type DesignBodyVariant = z.infer<typeof designBodyVariantSchema>;
export type DesignFile = z.infer<typeof designFileSchema>;
export type DesignCategory = (typeof DESIGN_CATEGORIES)[number];
