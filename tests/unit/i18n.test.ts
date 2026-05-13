import { describe, expect, it } from "vitest";

import { isSupportedLocale, resolveLocale } from "@/lib/i18n/config";

describe("i18n.resolveLocale", () => {
  it("ja / en は採用", () => {
    expect(resolveLocale("ja")).toBe("ja");
    expect(resolveLocale("en")).toBe("en");
  });

  it("ja-JP のような地域付きも先頭 2 文字で判定", () => {
    expect(resolveLocale("ja-JP")).toBe("ja");
    expect(resolveLocale("en_US")).toBe("en");
  });

  it("未対応言語は ja にフォールバック", () => {
    expect(resolveLocale("fr")).toBe("ja");
    expect(resolveLocale("ko-KR")).toBe("ja");
    expect(resolveLocale(null)).toBe("ja");
    expect(resolveLocale(undefined)).toBe("ja");
  });

  it("Phase 5 で zh-CN は zh にマッチする", () => {
    expect(resolveLocale("zh-CN")).toBe("zh");
  });

  it("isSupportedLocale は ja/en/vi/id/zh で true", () => {
    expect(isSupportedLocale("ja")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("id")).toBe(true);
    expect(isSupportedLocale("zh")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
    expect(isSupportedLocale(123)).toBe(false);
  });
});
