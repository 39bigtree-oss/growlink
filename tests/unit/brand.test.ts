import { describe, expect, it } from "vitest";

import { BRAND } from "@/lib/brand";

describe("BRAND", () => {
  it("プロダクト名は Tsumugi 固定", () => {
    expect(BRAND.name).toBe("Tsumugi");
    expect(BRAND.fullName).toBe("Tsumugi");
  });

  it("運営会社は株式会社グロウリンク", () => {
    expect(BRAND.company.nameJa).toContain("グロウリンク");
    expect(BRAND.company.nameEn).toContain("Growlink");
  });

  it("タグラインは日本語/英語の両方が空でない", () => {
    expect(BRAND.taglineJa.length).toBeGreaterThan(0);
    expect(BRAND.taglineEn.length).toBeGreaterThan(0);
  });

  it("description は 1 文以上 (各言語)", () => {
    expect(BRAND.descriptionJa.length).toBeGreaterThan(30);
    expect(BRAND.descriptionEn.length).toBeGreaterThan(30);
  });
});
