import { describe, expect, it } from "vitest";

import { scoreAttritionRisk } from "@/lib/analytics/attrition-risk";

describe("scoreAttritionRisk", () => {
  it("入社直後 (1 ヶ月未満) は HIGH 以上のリスク", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2026-05-01"),
      attritionAt: null,
      monthlyWage: 400000,
      employmentType: "DIRECT",
      experienceYears: 5,
      now: new Date("2026-05-15"),
    });
    expect(r.contributors.tenureCurve).toBe(35);
    expect(r.band === "HIGH" || r.band === "CRITICAL" || r.band === "MEDIUM").toBe(true);
  });

  it("派遣形態は常勤より高いリスクスコア", () => {
    const base = {
      startDate: new Date("2026-01-01"),
      attritionAt: null,
      monthlyWage: 300000,
      experienceYears: 5,
      now: new Date("2026-07-01"),
    };
    const dispatch = scoreAttritionRisk({ ...base, employmentType: "DISPATCH" });
    const direct = scoreAttritionRisk({ ...base, employmentType: "DIRECT" });
    expect(dispatch.score).toBeGreaterThan(direct.score);
    expect(dispatch.contributors.employmentType).toBe(15);
    expect(direct.contributors.employmentType).toBe(5);
  });

  it("給与ギャップが大きいとスコアが上昇", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2026-01-01"),
      attritionAt: null,
      monthlyWage: 300000,
      employmentType: "DIRECT",
      experienceYears: 5,
      desiredMonthlyWage: 500000, // 40% 低い
      now: new Date("2026-07-01"),
    });
    expect(r.contributors.wageGap).toBe(20);
  });

  it("退職実績がある場合は確定スコア (1 ヶ月以内退職 → 100)", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2026-05-01"),
      attritionAt: new Date("2026-05-15"),
      monthlyWage: 400000,
      employmentType: "DIRECT",
      experienceYears: 5,
    });
    expect(r.contributors.realized).toBe(100);
    expect(r.score).toBe(100);
    expect(r.band).toBe("CRITICAL");
  });

  it("1 年以上経過すると score 大幅低下", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2024-05-01"),
      attritionAt: null,
      monthlyWage: 400000,
      employmentType: "DIRECT",
      experienceYears: 10,
      now: new Date("2026-05-15"),
    });
    expect(r.score).toBeLessThan(20);
    expect(r.band).toBe("LOW");
  });

  it("シフト一致軸 1 以下なら shiftMismatch=15", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2026-01-01"),
      attritionAt: null,
      monthlyWage: 300000,
      employmentType: "DIRECT",
      experienceYears: 5,
      shiftFitAxes: 0,
      now: new Date("2026-07-01"),
    });
    expect(r.contributors.shiftMismatch).toBe(15);
  });

  it("経験 1 年未満は experienceLow=12 (環境適応リスク)", () => {
    const r = scoreAttritionRisk({
      startDate: new Date("2026-01-01"),
      attritionAt: null,
      monthlyWage: 300000,
      employmentType: "DIRECT",
      experienceYears: 0,
      now: new Date("2026-07-01"),
    });
    expect(r.contributors.experienceLow).toBe(12);
  });
});
