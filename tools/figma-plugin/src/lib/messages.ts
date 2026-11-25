import type { DesignFile, DesignOrientation, MoodTag } from "@mind-do/shared";
import type { TextBind } from "./names";

// 피그마 쪽 코드(code.ts)와 플러그인 창(ui.ts)이 주고받는 메시지

export type Meta = {
  id: string;
  name: string;
  tags: MoodTag[];
  mainColor: string;
};

export type Issue = {
  level: "error" | "warn";
  message: string;
  nodeId?: string;
};

export type SelectionState =
  | { status: "none" }
  | { status: "design"; meta: Meta; category: string | null; pageName: string };

// 창에서 자를 그림: 티켓 한 장(가로 2000×800, 세로 800×2000)을 내보낸 원본에서 잘라 파일로 만든다
export type ImageJob = {
  file: string;
  source: string;
  crop: [number, number, number, number];
};

export type ToUi =
  | { type: "selection"; state: SelectionState }
  | { type: "checked"; issues: Issue[]; design: DesignFile | null }
  | {
      type: "exported";
      issues: Issue[];
      design: DesignFile;
      sources: Record<string, Uint8Array>;
      jobs: ImageJob[];
      stubSources: string[];
    }
  | { type: "notice"; message: string }
  | { type: "prepare-image"; id: number; bytes: Uint8Array };

// 창에서 배경 그림을 다듬은 결과
// transparent: 원래 투명한 PNG / removed: 단색 바탕을 지움 / opaque-full: 지울 바탕 없음(그림이 가득 참)
// not-uniform: 바탕이 한 가지 색이 아님 / too-much: 너무 많이 지워져 종이까지 지울 것 같음 / failed: 읽기 실패
export type ImageBox = { x: number; y: number; w: number; h: number };
export type PreparedImage = {
  status:
    | "transparent"
    | "removed"
    | "opaque-full"
    | "not-uniform"
    | "too-much"
    | "failed";
  box: ImageBox | null;
  bytes: Uint8Array | null;
  removedPercent: number;
};

export type AssignRole = "photo" | TextBind;

export type ToCode =
  | { type: "create-blank"; orientation: DesignOrientation }
  | { type: "apply-background" }
  | { type: "image-prepared"; id: number; result: PreparedImage }
  | { type: "save-meta"; meta: Meta }
  | { type: "check" }
  | { type: "export" }
  | { type: "assign"; role: AssignRole }
  | { type: "focus"; nodeId: string };
