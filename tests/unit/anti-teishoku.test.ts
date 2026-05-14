import { describe, expect, it } from "vitest";

import {
  calcAntiteishokuDate,
  daysUntilAntiteishoku,
  isApproachingAntiteishoku,
} from "@/lib/compliance/anti-teishoku";

describe("calcAntiteishokuDate", () => {
  it("4 月 1 日開始 → 3 年後の 3 月 31 日が抵触日", () => {
    const start = new Date("2024-04-01T00:00:00Z");
    const t = calcAntiteishokuDate(start);
    expect(t.toISOString().slice(0, 10)).toBe("2027-03-31");
  });

  it("月初開始 → 月末 (3 年後の前月末) が抵触日", () => {
    const start = new Date("2026-05-01T00:00:00Z");
    const t = calcAntiteishokuDate(start);
    expect(t.toISOString().slice(0, 10)).toBe("2029-04-30");
  });

  it("うるう年 2/29 開始は 3/1 にロールする (JS の挙動を保持)", () => {
    const start = new Date("2024-02-29T00:00:00Z");
    const t = calcAntiteishokuDate(start);
    // 2024-02-29 + 3y = 2027-03-01 (2027 の 2/29 が存在しないため)、その前日 = 2027-02-28
    expect(t.toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

describe("daysUntilAntiteishoku / isApproaching", () => {
  it("90 日先 → approaching=true", () => {
    const now = new Date("2026-05-14T00:00:00Z");
    const target = new Date("2026-08-01T00:00:00Z"); // 79 日後
    expect(daysUntilAntiteishoku(target, now)).toBe(79);
    expect(isApproachingAntiteishoku(target, now, 90)).toBe(true);
  });

  it("180 日先 → approaching=false (threshold 90)", () => {
    const now = new Date("2026-05-14T00:00:00Z");
    const target = new Date("2026-12-01T00:00:00Z");
    expect(isApproachingAntiteishoku(target, now, 90)).toBe(false);
  });

  it("既に過去 → approaching=false (負の残日数)", () => {
    const now = new Date("2026-05-14T00:00:00Z");
    const target = new Date("2026-04-01T00:00:00Z");
    expect(daysUntilAntiteishoku(target, now)).toBeLessThan(0);
    expect(isApproachingAntiteishoku(target, now, 90)).toBe(false);
  });
});
