import { beforeEach, describe, expect, it } from "vitest";

import { __resetAiClientForTests } from "@/lib/ai/client";
import { summarizeInterview } from "@/lib/ai/interview/summarizeInterview";

describe("summarizeInterview (mock AI)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
  });

  it("rank=A は overallScore 70 以上を返す", async () => {
    const r = await summarizeInterview({
      locale: "ja",
      applicant: {
        initials: "T.S",
        ageLabel: "40代前半",
        topDiagnosis: { category: "HOMEVISIT_NURSE", rank: "A" },
      },
      transcript: [
        { role: "ai", text: "現職について教えてください" },
        { role: "applicant", text: "訪問看護 10 年です。" },
      ],
    });
    expect(r.overallScore).toBeGreaterThanOrEqual(70);
    expect(r.strengths.length).toBeGreaterThanOrEqual(3);
    expect(r.recommendedNextAction).toContain("営業");
  });

  it("rank=D は overallScore が低く、追加面談を推奨", async () => {
    const r = await summarizeInterview({
      locale: "ja",
      applicant: {
        initials: "T.S",
        ageLabel: "40代前半",
        topDiagnosis: { category: "HOMEVISIT_NURSE", rank: "D" },
      },
      transcript: [{ role: "applicant", text: "..." }],
    });
    expect(r.overallScore).toBeLessThan(70);
    expect(r.recommendedNextAction).toContain("追加面談");
  });

  it("出力に機種依存文字を含まない", async () => {
    const r = await summarizeInterview({
      locale: "ja",
      applicant: {
        initials: "T.S",
        ageLabel: "40代前半",
        topDiagnosis: { category: "HOMEVISIT_NURSE", rank: "A" },
      },
      transcript: [],
    });
    const all = JSON.stringify(r);
    expect(/[①-⑳㊤㈱]/.test(all)).toBe(false);
  });
});
