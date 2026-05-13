import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { __resetAiClientForTests, complete } from "@/lib/ai/client";
import { buildAllCategoriesScores } from "@/lib/ai/diagnosis";

import { MOCK_PROVIDER_CASES } from "./mock-cases";

const goldenDir = path.join(__dirname, "mock-golden");

function loadGolden(id: string) {
  return JSON.parse(fs.readFileSync(path.join(goldenDir, `${id}.json`), "utf8"));
}

describe("mockProvider", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
  });

  it.each(MOCK_PROVIDER_CASES)("$id: 決定論的にゴールデンと一致", async (c) => {
    const ranked = buildAllCategoriesScores(c.applicant, c.gender);
    const payload = {
      applicant: { lastName: c.applicant.lastName, firstName: c.applicant.firstName },
      ranked,
    };
    const result = await complete({
      promptName: "diagnosis.system",
      system: "(test-system)",
      user: JSON.stringify(payload),
      model: "smart",
      jsonSchema: { type: "object" },
    });
    expect(result).toEqual(loadGolden(c.id));
  });

  it("同じ payload で 2 回呼んでも結果が一致 (決定論性)", async () => {
    const c = MOCK_PROVIDER_CASES[0];
    const ranked = buildAllCategoriesScores(c.applicant, c.gender);
    const payload = {
      applicant: { lastName: c.applicant.lastName, firstName: c.applicant.firstName },
      ranked,
    };
    const opts = {
      promptName: "diagnosis.system",
      system: "(test)",
      user: JSON.stringify(payload),
      model: "smart" as const,
      jsonSchema: { type: "object" },
    };
    const a = await complete(opts);
    const b = await complete(opts);
    expect(b).toEqual(a);
  });

  it("payload が変わると違うコメントが返り得る", async () => {
    const ranked1 = buildAllCategoriesScores(MOCK_PROVIDER_CASES[0].applicant, "FEMALE");
    const ranked2 = buildAllCategoriesScores(MOCK_PROVIDER_CASES[1].applicant, "MALE");
    const a = await complete<Record<string, { proComment: string }>>({
      promptName: "diagnosis.system",
      system: "(test)",
      user: JSON.stringify({
        applicant: { lastName: "山田", firstName: "花子" },
        ranked: ranked1,
      }),
      model: "smart",
      jsonSchema: { type: "object" },
    });
    const b = await complete<Record<string, { proComment: string }>>({
      promptName: "diagnosis.system",
      system: "(test)",
      user: JSON.stringify({
        applicant: { lastName: "佐藤", firstName: "健" },
        ranked: ranked2,
      }),
      model: "smart",
      jsonSchema: { type: "object" },
    });
    expect(a.ok && b.ok).toBe(true);
    // 全 11 カテゴリのいずれかでコメントが違うことを期待。
    if (a.ok && a.kind === "json" && b.ok && b.kind === "json") {
      const aData = a.data;
      const bData = b.data;
      const anyDiff = Object.keys(aData).some(
        (k) => aData[k].proComment !== bData[k].proComment,
      );
      expect(anyDiff).toBe(true);
    }
  });

  it("provider 名は 'mock'", async () => {
    const result = await complete({
      promptName: "diagnosis.system",
      system: "(test)",
      user: JSON.stringify({ applicant: {}, ranked: [] }),
      model: "smart",
      jsonSchema: { type: "object" },
    });
    expect(result.provider).toBe("mock");
  });
});
