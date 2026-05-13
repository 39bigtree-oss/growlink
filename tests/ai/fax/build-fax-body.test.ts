import { beforeEach, describe, expect, it } from "vitest";

import { __resetAiClientForTests } from "@/lib/ai/client";
import { buildFaxBody } from "@/lib/ai/fax/buildFaxBody";
import type { MaskedApplicantForFax } from "@/lib/mask";

const FAC = {
  name: "(架空) 訪問看護ステーションあおぞら",
  category: "HOMEVISIT_NURSE" as const,
  prefecture: "東京都",
  city: "新宿区",
};

function masked(): MaskedApplicantForFax {
  return {
    initials: "T.S",
    gender: "FEMALE",
    genderLabel: "女性",
    ageLabel: "40代前半",
    ageBand: "40s",
    qualifications: ["看護師"],
    desiredCategories: ["HOMEVISIT_NURSE"],
    prefecture: "東京都",
    language: "ja",
    nationality: "JP",
  };
}

// 機種依存文字 (丸囲み数字 ①〜⑳、㊤ ㊥ ㊦ ㈱ ㈲ ㈳ ㊗ ㊐ など) が混入していないことを確認する。
const FORBIDDEN_CHARS_RE = /[①-⑳㊔-㊞㈠-㉃㊤-㋾]/;

describe("buildFaxBody (mock provider)", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    __resetAiClientForTests();
  });

  it("HOMEVISIT_NURSE で訪問看護向け cover/detail が返る", async () => {
    const body = await buildFaxBody({
      applicant: masked(),
      facility: FAC,
      diagnosisForCategory: { category: "HOMEVISIT_NURSE", rank: "A", score: 82 },
      desired: {},
    });
    expect(body.provider).toBe("mock");
    expect(body.cover.headline).toContain("訪問看護");
    expect(body.cover.summary).toContain("ランク A");
    expect(body.detail.careerHighlights.length).toBeGreaterThanOrEqual(3);
    expect(body.detail.strengths.length).toBeGreaterThanOrEqual(3);
  });

  it("業態が変わると headline と strengths が変わる", async () => {
    const a = await buildFaxBody({
      applicant: masked(),
      facility: FAC,
      diagnosisForCategory: { category: "HOMEVISIT_NURSE", rank: "A", score: 82 },
    });
    const b = await buildFaxBody({
      applicant: masked(),
      facility: { ...FAC, category: "HOSPITAL_ACUTE" },
      diagnosisForCategory: { category: "HOSPITAL_ACUTE", rank: "B", score: 65 },
    });
    expect(a.cover.headline).not.toBe(b.cover.headline);
    expect(a.detail.strengths).not.toEqual(b.detail.strengths);
  });

  it("rank に応じて summary 文言が変わる (S / D)", async () => {
    const high = await buildFaxBody({
      applicant: masked(),
      facility: FAC,
      diagnosisForCategory: { category: "HOMEVISIT_NURSE", rank: "S", score: 90 },
    });
    const low = await buildFaxBody({
      applicant: masked(),
      facility: FAC,
      diagnosisForCategory: { category: "HOMEVISIT_NURSE", rank: "D", score: 30 },
    });
    expect(high.cover.summary).toContain("非常に高く");
    expect(low.cover.summary).toContain("マッチは見えていません");
  });

  it("AI 出力に機種依存文字が混入しない", async () => {
    const body = await buildFaxBody({
      applicant: masked(),
      facility: FAC,
      diagnosisForCategory: { category: "HOMEVISIT_NURSE", rank: "A", score: 82 },
    });
    const allText = [
      body.cover.greeting,
      body.cover.headline,
      body.cover.summary,
      body.cover.callToAction,
      body.detail.interviewSummary,
      ...body.detail.careerHighlights,
      ...body.detail.strengths,
      body.detail.commuteAreaNote,
      body.detail.startAvailability,
      body.detail.introTermsNote,
    ].join("\n");
    expect(FORBIDDEN_CHARS_RE.test(allText)).toBe(false);
  });
});
