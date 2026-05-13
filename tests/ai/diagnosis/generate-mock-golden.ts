/**
 * mock プロバイダのゴールデンファイル生成スクリプト。
 *
 *   pnpm tsx tests/ai/diagnosis/generate-mock-golden.ts
 *
 * 雛形 (src/lib/ai/providers/mock-data/*.json) を編集したら走らせる。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { __resetAiClientForTests, complete } from "@/lib/ai/client";
import { buildAllCategoriesScores } from "@/lib/ai/diagnosis";

import { MOCK_PROVIDER_CASES } from "./mock-cases";

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenDir = path.join(here, "mock-golden");
fs.mkdirSync(goldenDir, { recursive: true });

async function main() {
  process.env.AI_PROVIDER = "mock";
  __resetAiClientForTests();

  for (const c of MOCK_PROVIDER_CASES) {
    const ranked = buildAllCategoriesScores(c.applicant, c.gender);
    const payload = {
      applicant: {
        lastName: c.applicant.lastName,
        firstName: c.applicant.firstName,
      },
      ranked,
    };
    const result = await complete({
      promptName: "diagnosis.system",
      system: "(test-system)",
      user: JSON.stringify(payload),
      model: "smart",
      jsonSchema: { type: "object" },
    });
    const out = path.join(goldenDir, `${c.id}.json`);
    fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`wrote ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
