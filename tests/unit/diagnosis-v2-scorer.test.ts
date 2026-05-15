import { describe, expect, it } from "vitest";
import { FacilityCategory } from "@prisma/client";

import { computeBaseDiagnosis } from "@/lib/ai/diagnosis-v2/scorer";

describe("computeBaseDiagnosis", () => {
  const baseInput = {
    applicantId: "test-001",
    qualifications: ["看護師"],
    desiredCategories: [FacilityCategory.HOMEVISIT_NURSE],
    experienceYears: 5,
  };

  it("結果に typeCode / traits / engines / desiredFit が含まれる", () => {
    const r = computeBaseDiagnosis(baseInput);
    expect(r.typeCode).toMatch(/^[CAERTIS F]{4}$/);
    expect(r.traits.caring).toBeGreaterThanOrEqual(5);
    expect(r.traits.caring).toBeLessThanOrEqual(95);
    expect(r.engines.totalPower.rank).toMatch(/^[SABCD]$/);
    expect(r.desiredFit.length).toBe(1); // 希望業態 1 個分のみ
  });

  it("希望業態のみが desiredFit に入る", () => {
    const r = computeBaseDiagnosis({
      ...baseInput,
      desiredCategories: [
        FacilityCategory.HOMEVISIT_NURSE,
        FacilityCategory.DAYCARE_ELDERLY,
      ],
    });
    expect(r.desiredFit).toHaveLength(2);
    expect(r.desiredFit.every((f) => f.isDesired)).toBe(true);
  });

  it("hiddenFit は希望外のみ + 最大 2 個", () => {
    const r = computeBaseDiagnosis(baseInput);
    expect(r.hiddenFit.every((f) => !f.isDesired)).toBe(true);
    expect(r.hiddenFit.length).toBeLessThanOrEqual(2);
  });

  it("同じ applicantId は同じ結果 (決定論性)", () => {
    const a = computeBaseDiagnosis(baseInput);
    const b = computeBaseDiagnosis(baseInput);
    expect(a.typeCode).toBe(b.typeCode);
    expect(a.traits).toEqual(b.traits);
    expect(a.engines.totalPower.score).toBe(b.engines.totalPower.score);
  });

  it("strengths は 3 個", () => {
    const r = computeBaseDiagnosis(baseInput);
    expect(r.strengths).toHaveLength(3);
  });

  it("partners は 2 個 (4 文字コードと日本語名のペア)", () => {
    const r = computeBaseDiagnosis(baseInput);
    expect(r.partners.length).toBeGreaterThan(0);
    for (const p of r.partners) {
      expect(p.code).toHaveLength(4);
      expect(p.name).toBeTruthy();
    }
  });

  it("4 大エンジンのスコアは 35〜95 の範囲", () => {
    const r = computeBaseDiagnosis(baseInput);
    for (const e of [
      r.engines.totalPower,
      r.engines.foundation,
      r.engines.execution,
      r.engines.intellect,
    ]) {
      expect(e.score).toBeGreaterThanOrEqual(35);
      expect(e.score).toBeLessThanOrEqual(95);
    }
  });
});
