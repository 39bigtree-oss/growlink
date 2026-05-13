import { beforeEach, describe, expect, it } from "vitest";

import { __resetAiClientForTests } from "@/lib/ai/client";
import { buildNextQuestion } from "@/lib/ai/interview/buildNextQuestion";

describe("buildNextQuestion (mock AI)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
  });

  function baseInput(turnIndex: number) {
    return {
      locale: "ja",
      applicant: {
        initials: "T.S",
        ageLabel: "40代前半",
        qualifications: ["看護師"],
        topDiagnosis: { category: "HOMEVISIT_NURSE", rank: "A" },
      },
      skillSheet: { careersSummary: "訪問看護 10 年", selfPR: "" },
      history: [],
      turnIndex,
      maxTurns: 5,
    };
  }

  it("turnIndex=0 はアイスブレイク + 自己紹介を促す質問", async () => {
    const r = await buildNextQuestion(baseInput(0));
    expect(r.question.length).toBeGreaterThan(0);
    expect(r.shouldClose).toBe(false);
  });

  it("turnIndex=maxTurns-1 で shouldClose=true", async () => {
    const r = await buildNextQuestion(baseInput(4));
    expect(r.shouldClose).toBe(true);
  });

  it("AI 出力に機種依存文字を含まない", async () => {
    const r = await buildNextQuestion(baseInput(2));
    expect(/[①-⑳㊤㈱]/.test(r.question)).toBe(false);
  });

  it("locale=en でも question を返す", async () => {
    const r = await buildNextQuestion({ ...baseInput(1), locale: "en" });
    expect(r.question.length).toBeGreaterThan(0);
  });
});
