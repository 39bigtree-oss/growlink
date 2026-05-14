import { describe, expect, it } from "vitest";

import {
  allQualificationsMet,
  isQualificationMet,
} from "@/lib/matching/skill-hierarchy";

describe("isQualificationMet", () => {
  it("完全一致は満たす", () => {
    expect(isQualificationMet("看護師", ["看護師"])).toBe(true);
  });

  it("上位資格保持で satisfy", () => {
    expect(isQualificationMet("看護師", ["認定看護師"])).toBe(true);
    expect(isQualificationMet("看護師", ["専門看護師"])).toBe(true);
    expect(isQualificationMet("准看護師", ["看護師"])).toBe(true);
    expect(isQualificationMet("介護職員初任者研修", ["介護福祉士"])).toBe(true);
  });

  it("下位資格 / 別資格は satisfy しない", () => {
    expect(isQualificationMet("看護師", ["介護福祉士"])).toBe(false);
    expect(isQualificationMet("介護福祉士", ["介護職員初任者研修"])).toBe(false);
  });

  it("登録外の required は完全一致にフォールバック", () => {
    expect(isQualificationMet("(架空) 救急救命士", ["看護師"])).toBe(false);
    expect(isQualificationMet("(架空) 救急救命士", ["(架空) 救急救命士"])).toBe(true);
  });
});

describe("allQualificationsMet", () => {
  it("全て満たす場合 ok=true", () => {
    expect(allQualificationsMet(["看護師", "認知症ケア専門士"], ["認定看護師", "認知症ケア専門士"]))
      .toEqual({ ok: true, missing: [] });
  });

  it("欠けていたら missing リスト返す", () => {
    const r = allQualificationsMet(["看護師", "認知症ケア専門士"], ["介護福祉士"]);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("看護師");
  });

  it("空の required は常に ok", () => {
    expect(allQualificationsMet([], ["介護福祉士"])).toEqual({ ok: true, missing: [] });
  });
});
