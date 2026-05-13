/**
 * ゴールデンファイル生成スクリプト。
 *
 *   pnpm tsx tests/ai/decisions/generate-golden.ts
 *
 * 係数や相性表を変更したときに走らせる。生成された JSON を git に必ずコミットすること。
 * 何も変えていないのに diff が出る場合、決定論性が壊れている疑いがあるので調査する。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAllCategoriesScores } from "@/lib/ai/diagnosis";

import { DIAGNOSIS_CASES } from "./cases";

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenDir = path.join(here, "golden");
fs.mkdirSync(goldenDir, { recursive: true });

for (const c of DIAGNOSIS_CASES) {
  const result = buildAllCategoriesScores(c.applicant, c.gender);
  const out = path.join(goldenDir, `${c.id}.json`);
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`wrote ${out}`);
}
