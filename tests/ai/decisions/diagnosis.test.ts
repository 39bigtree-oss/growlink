import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ALL_CATEGORIES,
  buildAllCategoriesScores,
  toRank,
  type CategoryScore,
} from "@/lib/ai/diagnosis";

import { DIAGNOSIS_CASES } from "./cases";

const goldenDir = path.join(__dirname, "golden");

function loadGolden(id: string): CategoryScore[] {
  const file = path.join(goldenDir, `${id}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as CategoryScore[];
}

describe("buildAllCategoriesScores — ゴールデンテスト", () => {
  it.each(DIAGNOSIS_CASES)("$id: $description", (c) => {
    const expected = loadGolden(c.id);
    const actual = buildAllCategoriesScores(c.applicant, c.gender);
    expect(actual).toEqual(expected);
  });

  it.each(DIAGNOSIS_CASES)("$id: 全 11 カテゴリが ALL_CATEGORIES 順で返る", (c) => {
    const actual = buildAllCategoriesScores(c.applicant, c.gender);
    expect(actual.map((r) => r.category)).toEqual([...ALL_CATEGORIES]);
  });

  it.each(DIAGNOSIS_CASES)("$id: score は 0-100 / rank は toRank と一致", (c) => {
    const actual = buildAllCategoriesScores(c.applicant, c.gender);
    for (const row of actual) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
      expect(row.rank).toBe(toRank(row.score));
    }
  });

  it.each(DIAGNOSIS_CASES)("$id: 決定論性 — 2 回実行しても完全一致", (c) => {
    const a = buildAllCategoriesScores(c.applicant, c.gender);
    const b = buildAllCategoriesScores(c.applicant, c.gender);
    expect(b).toEqual(a);
  });
});
