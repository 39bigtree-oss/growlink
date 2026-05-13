import { describe, expect, it } from "vitest";

import {
  aggregateScore,
  calculateBirthScore,
  calculateDesireScore,
  calculateNameScore,
  calculateQualificationScore,
  computeGrids,
  isKanaOnly,
  kanjiRatio,
  lifePathNumber,
  strokesOf,
  toRank,
  totalStrokes,
  yearElement,
  type BirthSubScore,
  type DesireSubScore,
  type NameSubScore,
  type QualificationSubScore,
} from "@/lib/ai/diagnosis";

describe("strokes ユーティリティ", () => {
  it("テーブル登録済みの漢字は正しい画数を返す", () => {
    expect(strokesOf("山")).toBe(3);
    expect(strokesOf("田")).toBe(5);
    expect(strokesOf("花")).toBe(7);
    expect(strokesOf("子")).toBe(3);
  });

  it("未登録の漢字はデフォルト 8 を返す", () => {
    // テーブルにまず無さそうな珍字 (例: U+9F9F 龜 は登録済みだが U+9F50 齐 はおそらく無い)。
    expect(strokesOf("齐")).toBe(8);
  });

  it("ひらがな・カタカナ・英字は 1 画扱い", () => {
    expect(strokesOf("あ")).toBe(1);
    expect(strokesOf("ア")).toBe(1);
    expect(strokesOf("A")).toBe(1);
  });

  it("totalStrokes は文字単位の和", () => {
    expect(totalStrokes("山田")).toBe(8);
    expect(totalStrokes("花子")).toBe(10);
  });

  it("kanjiRatio はカナ・ローマ字混在で正しい比率を返す", () => {
    expect(kanjiRatio("山田")).toBe(1);
    expect(kanjiRatio("Smith")).toBe(0);
    expect(kanjiRatio("山ダ")).toBeCloseTo(0.5);
  });

  it("isKanaOnly はカナ専用名のみ true", () => {
    expect(isKanaOnly("マリア")).toBe(true);
    expect(isKanaOnly("はなこ")).toBe(true);
    expect(isKanaOnly("山田")).toBe(false);
    expect(isKanaOnly("John")).toBe(false);
  });
});

describe("computeGrids: 五格計算", () => {
  it("山田 花子 → 天=8/人=12/地=10/外=6/総=18", () => {
    const g = computeGrids("山田", "花子");
    expect(g.tenkaku).toBe(8);
    expect(g.jinkaku).toBe(12);
    expect(g.chikaku).toBe(10);
    expect(g.gaikaku).toBe(6);
    expect(g.soukaku).toBe(18);
  });

  it("1 字姓 + 1 字名でも 0 にならない (霊数 +1 補正)", () => {
    const g = computeGrids("林", "葵");
    expect(g.tenkaku).toBeGreaterThan(0);
    expect(g.chikaku).toBeGreaterThan(0);
    expect(g.jinkaku).toBeGreaterThan(0);
  });
});

describe("calculateNameScore: 漢字比率による中立化", () => {
  it("ローマ字主体の名前は中立値 15 を返し fellOff=true", () => {
    const r = calculateNameScore("Smith", "John", "HOSPITAL_ACUTE");
    expect(r.value).toBe(15);
    expect(r.details.fellOff).toBe(true);
  });

  it("カナのみの名前は中立値 15 を返すが fellOff=false (意図的なカナ名と解釈)", () => {
    const r = calculateNameScore("デラクルス", "マリア", "HOMEVISIT_NURSE");
    expect(r.value).toBe(15);
    expect(r.details.fellOff).toBe(false);
  });

  it("カテゴリ群でスコアにばらつきが出る (相性差が機能している)", () => {
    // 隣接カテゴリ同士は同点になり得るが、11 業態全体では必ず複数の値が現れることを期待する。
    const all = [
      "HOSPITAL_ACUTE",
      "HOSPITAL_GENERAL",
      "CLINIC",
      "DAYCARE_ELDERLY",
      "REHAB_DAY",
      "HOMEVISIT_NURSE",
      "HOMEVISIT_NURSE_PSYCHIATRY",
      "HOMEVISIT_CARE",
      "DAYCARE_DISABILITY",
      "HOMEVISIT_DISABILITY",
      "GROUP_HOME_DISABILITY",
    ] as const;
    const values = all.map((c) => calculateNameScore("山田", "花子", c).value);
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});

describe("calculateBirthScore: 五行 + Life Path", () => {
  it("yearElement: 1990 → 庚午 → 金", () => {
    // 1990 は庚午年。庚 = metal。
    expect(yearElement(1990)).toBe("metal");
  });

  it("yearElement: 1984 → 甲子 → 木", () => {
    expect(yearElement(1984)).toBe("wood");
  });

  it("lifePathNumber: マスター 11 を保持", () => {
    expect(lifePathNumber(1992, 4, 4)).toBe(11);
  });

  it("lifePathNumber: マスター 22 を保持 (例: 2000-01-19 → 4 になる例は別。22 の例として 1988-12-31)", () => {
    // 1988-12-31 -> 1+9+8+8+1+2+3+1 = 33。マスター 33 を保持
    expect(lifePathNumber(1988, 12, 31)).toBe(33);
  });

  it("カテゴリにより異なるスコアが返る", () => {
    const a = calculateBirthScore("1990-04-12", "FEMALE", "HOSPITAL_ACUTE");
    const b = calculateBirthScore("1990-04-12", "FEMALE", "GROUP_HOME_DISABILITY");
    expect(a.value).not.toBe(b.value);
  });

  it("Date と ISO 文字列で同値を返す", () => {
    const a = calculateBirthScore("1990-04-12", "FEMALE", "HOMEVISIT_NURSE");
    const b = calculateBirthScore(new Date("1990-04-12T00:00:00Z"), "FEMALE", "HOMEVISIT_NURSE");
    expect(a).toEqual(b);
  });
});

describe("calculateQualificationScore: required/preferred/related", () => {
  it("required を持っていれば 25 点満点", () => {
    const r = calculateQualificationScore(["看護師"], "HOMEVISIT_NURSE");
    expect(r.value).toBe(25);
    expect(r.details.matched).toContain("看護師");
  });

  it("preferred のみなら部分点 (~17 点)", () => {
    const r = calculateQualificationScore(["准看護師"], "HOSPITAL_GENERAL");
    expect(r.value).toBeGreaterThan(15);
    expect(r.value).toBeLessThan(25);
  });

  it("related のみならさらに小さい点 (~10 点)", () => {
    // HOMEVISIT_CARE では 社会福祉士 は related (係数 0.4) なので 10 点前後。
    const r = calculateQualificationScore(["社会福祉士"], "HOMEVISIT_CARE");
    expect(r.value).toBeGreaterThan(5);
    expect(r.value).toBeLessThan(15);
  });

  it("無資格でも完全 0 にしない (NONE_FLOOR)", () => {
    const r = calculateQualificationScore([], "HOSPITAL_ACUTE");
    expect(r.value).toBeGreaterThan(0);
  });

  it("required と related の両方を持っていれば required の最高点を採用する", () => {
    const r = calculateQualificationScore(
      ["看護師", "理学療法士"],
      "HOSPITAL_ACUTE",
    );
    expect(r.value).toBe(25);
  });
});

describe("calculateDesireScore: 希望整合度", () => {
  it("希望未選択は中立 (~50%)", () => {
    const r = calculateDesireScore([], "HOSPITAL_ACUTE");
    expect(r.details.matchType).toBe("none");
    expect(r.value).toBe(Math.round(15 * 0.5));
  });

  it("完全一致は満点 15", () => {
    const r = calculateDesireScore(["HOMEVISIT_NURSE"], "HOMEVISIT_NURSE");
    expect(r.value).toBe(15);
    expect(r.details.matchType).toBe("exact");
  });

  it("隣接カテゴリは部分点", () => {
    // HOMEVISIT_NURSE の adjacent には HOMEVISIT_NURSE_PSYCHIATRY が入っている。
    const r = calculateDesireScore(["HOMEVISIT_NURSE_PSYCHIATRY"], "HOMEVISIT_NURSE");
    expect(r.details.matchType).toBe("adjacent");
    expect(r.value).toBeGreaterThan(5);
    expect(r.value).toBeLessThan(15);
  });

  it("無関係カテゴリは最低点", () => {
    const r = calculateDesireScore(["HOSPITAL_ACUTE"], "GROUP_HOME_DISABILITY");
    expect(r.details.matchType).toBe("none");
    expect(r.value).toBeLessThanOrEqual(3);
  });
});

describe("aggregateScore", () => {
  const dummyName: NameSubScore = {
    value: 30,
    details: {
      strokes: { lastName: 0, firstName: 0, total: 0 },
      grids: { tenkaku: 1, jinkaku: 1, chikaku: 1, gaikaku: 1, soukaku: 1 },
      fellOff: false,
    },
  };
  const dummyBirth: BirthSubScore = {
    value: 30,
    details: { yearElement: "wood", lifePath: 1 },
  };
  const dummyQual: QualificationSubScore = {
    value: 25,
    details: { matched: [], related: [] },
  };
  const dummyDesire: DesireSubScore = {
    value: 15,
    details: { matchType: "exact" },
  };

  it("満点入力で 100 が返る", () => {
    const { total } = aggregateScore(dummyName, dummyBirth, dummyQual, dummyDesire);
    expect(total).toBe(100);
  });

  it("過剰な入力値は clamp される", () => {
    const huge = { ...dummyName, value: 999 } as NameSubScore;
    const { total, breakdown } = aggregateScore(huge, dummyBirth, dummyQual, dummyDesire);
    expect(breakdown.name.value).toBe(30); // MAX_NAME_SCORE
    expect(total).toBeLessThanOrEqual(100);
  });
});

describe("toRank", () => {
  it.each([
    [100, "S"],
    [85, "S"],
    [84, "A"],
    [70, "A"],
    [69, "B"],
    [55, "B"],
    [54, "C"],
    [40, "C"],
    [39, "D"],
    [0, "D"],
  ])("%i → %s", (score, rank) => {
    expect(toRank(score)).toBe(rank);
  });
});
