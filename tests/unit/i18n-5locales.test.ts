import { describe, expect, it } from "vitest";

import { isSupportedLocale, resolveLocale, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

describe("Phase 5 i18n: 5 locales", () => {
  it("SUPPORTED_LOCALES に ja/en/vi/id/zh が含まれる", () => {
    expect([...SUPPORTED_LOCALES]).toEqual(["ja", "en", "vi", "id", "zh"]);
  });

  it("isSupportedLocale が 5 言語すべて true", () => {
    for (const l of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(l)).toBe(true);
    }
  });

  it.each(["ja", "en", "vi", "id", "zh"] as const)(
    "messages/%s.json に skillSheet.pageTitle が含まれる",
    (locale) => {
      const m = getMessages(locale) as { skillSheet: { pageTitle: string } };
      expect(m.skillSheet.pageTitle.length).toBeGreaterThan(0);
    },
  );

  it("vi-VN / id-ID / zh-CN といった地域付きでも先頭 2 文字を引く", () => {
    expect(resolveLocale("vi-VN")).toBe("vi");
    expect(resolveLocale("id_ID")).toBe("id");
    expect(resolveLocale("zh-CN")).toBe("zh");
  });

  it("interview.start も 5 言語で空でない", () => {
    for (const l of SUPPORTED_LOCALES) {
      const m = getMessages(l) as { interview: { start: string } };
      expect(m.interview.start.length).toBeGreaterThan(0);
    }
  });
});
