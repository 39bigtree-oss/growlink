import { beforeEach, describe, expect, it } from "vitest";

import { __resetAiClientForTests } from "@/lib/ai/client";
import { parseResume } from "@/lib/ai/skill-sheet/parseResume";

describe("parseResume (mock AI)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
  });

  it("ocrProvider に紐づくテンプレを返し、機種依存文字を含まない", async () => {
    const { parsed } = await parseResume({
      ocrText: "履歴書\n氏名: 山田 花子",
      ocrProvider: "mock:nurse-mid-career",
    });
    expect(parsed.educations.length).toBeGreaterThan(0);
    expect(parsed.careers.length).toBeGreaterThan(0);
    const all = JSON.stringify(parsed);
    expect(/[①-⑳㊤㈱]/.test(all)).toBe(false);
  });

  it("ocrProvider なしでもテキストハッシュで決定論的に同じ結果を返す", async () => {
    const a = await parseResume({ ocrText: "2010年4月 みなと総合病院 看護師" });
    const b = await parseResume({ ocrText: "2010年4月 みなと総合病院 看護師" });
    expect(a.parsed).toEqual(b.parsed);
  });

  it("careers は YYYY-MM 形式、to は現職なら空文字", async () => {
    const { parsed } = await parseResume({
      ocrText: "履歴書",
      ocrProvider: "mock:careworker-young",
    });
    for (const c of parsed.careers) {
      expect(c.from).toMatch(/^\d{4}-\d{2}$/);
      expect(c.to === "" || /^\d{4}-\d{2}$/.test(c.to)).toBe(true);
    }
  });
});
