import { describe, expect, it } from "vitest";

import { makeCacheKey } from "@/lib/pdf/v2/cache";

describe("makeCacheKey", () => {
  it("applicantId + variant + version (unix秒) を含む", () => {
    const date = new Date("2026-05-15T12:00:00Z");
    const key = makeCacheKey("appl-1", "applicant", date);
    expect(key).toContain("appl-1");
    expect(key).toContain("applicant");
    expect(key).toContain("v");
    expect(key).toContain(String(Math.floor(date.getTime() / 1000)));
  });

  it("variant が違うと key も違う", () => {
    const d = new Date("2026-05-15T12:00:00Z");
    expect(makeCacheKey("a", "applicant", d)).not.toBe(makeCacheKey("a", "facility", d));
  });

  it("updatedAt が違うと key も違う (自動 invalidation)", () => {
    const d1 = new Date("2026-05-15T12:00:00Z");
    const d2 = new Date("2026-05-16T12:00:00Z");
    expect(makeCacheKey("a", "applicant", d1)).not.toBe(
      makeCacheKey("a", "applicant", d2),
    );
  });

  it("同じ入力なら同じ key", () => {
    const d = new Date("2026-05-15T12:00:00Z");
    expect(makeCacheKey("a", "applicant", d)).toBe(makeCacheKey("a", "applicant", d));
  });
});
