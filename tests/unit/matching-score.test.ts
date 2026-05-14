import { describe, expect, it } from "vitest";

import { scoreMatch, type JobOrderForMatching } from "@/lib/matching/score";
import type { ApplicantMatchingProfile } from "@/lib/schemas/job-order";

const baseApplicant: ApplicantMatchingProfile = {
  applicantId: "a1",
  prefecture: "東京都",
  city: "新宿区",
  desiredCategories: [],
  qualifications: ["看護師", "認知症ケア専門士"],
  experienceYears: 8,
  desiredMonthlyWage: 400000,
  shiftPreference: { dayShift: true, nightShift: false, oncall: true, weeklyDays: 4 },
};

const baseJobOrder: JobOrderForMatching = {
  facility: { prefecture: "東京都", city: "新宿区" },
  position: "NURSE",
  employmentType: "DIRECT",
  hourlyWageMin: null,
  hourlyWageMax: null,
  monthlyWageMin: 380000,
  monthlyWageMax: 460000,
  shiftPattern: { dayShift: true, nightShift: false, oncall: true, weeklyDays: 5 },
  requiredQualifications: ["看護師"],
  preferredQualifications: ["認知症ケア専門士"],
  minExperienceYears: 3,
};

describe("scoreMatch", () => {
  it("理想的な応募者は high score を返す", () => {
    const r = scoreMatch(baseApplicant, baseJobOrder);
    expect(r.hardFiltered).toBe(false);
    expect(r.total).toBeGreaterThanOrEqual(85);
    expect(r.breakdown.qual).toBeGreaterThan(80);
  });

  it("必須資格未保持の場合 total=0 (ハードフィルタ)", () => {
    const r = scoreMatch(
      { ...baseApplicant, qualifications: [] },
      baseJobOrder,
    );
    expect(r.hardFiltered).toBe(true);
    expect(r.total).toBe(0);
  });

  it("都道府県外は distance スコアが大幅に下がる", () => {
    const r = scoreMatch(
      { ...baseApplicant, prefecture: "大阪府", city: "大阪市" },
      baseJobOrder,
    );
    expect(r.breakdown.distance).toBeLessThan(50);
  });

  it("月給上限が希望未満なら wage スコアが下がる", () => {
    const r = scoreMatch(
      { ...baseApplicant, desiredMonthlyWage: 600000 },
      baseJobOrder,
    );
    expect(r.breakdown.wage).toBeLessThan(100);
  });

  it("経験年数が必要を下回ると exp スコアが下がる", () => {
    const r = scoreMatch(
      { ...baseApplicant, experienceYears: 1 },
      { ...baseJobOrder, minExperienceYears: 5 },
    );
    expect(r.breakdown.exp).toBeLessThan(50);
  });

  it("決定論性: 同入力 → 同 total", () => {
    const a = scoreMatch(baseApplicant, baseJobOrder);
    const b = scoreMatch(baseApplicant, baseJobOrder);
    expect(a.total).toBe(b.total);
    expect(a.breakdown).toEqual(b.breakdown);
  });
});
