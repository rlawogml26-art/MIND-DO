import { DESIGN_FILE_DATA } from "./registry.generated.js";
import { designFileSchema, type DesignFile } from "./schema.js";

// 레포에 들어 있는 디자인 목록. 서버(AI가 고를 목록·저장 시 재검증)와 앱(렌더러)이 같이 쓴다.
// 형식이 틀린 파일은 빼고 싣는다. 던지면 서버·앱이 통째로 멈추고, CI 검사(check-designs)도
// 이 목록을 불러오다 멈춰서 어느 칸이 틀렸는지 알려 주지 못한다. 틀린 파일은 CI가 막는다.
export const DESIGNS: readonly DesignFile[] = DESIGN_FILE_DATA.flatMap((d) => {
  const parsed = designFileSchema.safeParse(d);
  return parsed.success ? [parsed.data] : [];
});

const byId = new Map(DESIGNS.map((d) => [d.id, d]));

export function findDesign(id: string): DesignFile | undefined {
  return byId.get(id);
}
