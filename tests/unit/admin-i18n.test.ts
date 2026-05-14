import { describe, expect, it } from "vitest";

import {
  ADMIN_LOCALES,
  DEFAULT_ADMIN_LOCALE,
  adminT,
  getAdminDict,
} from "@/lib/i18n/admin";

describe("admin i18n", () => {
  it("ADMIN_LOCALES に ja / en が含まれる", () => {
    expect(ADMIN_LOCALES).toContain("ja");
    expect(ADMIN_LOCALES).toContain("en");
  });

  it("デフォルトロケールは ja", () => {
    expect(DEFAULT_ADMIN_LOCALE).toBe("ja");
  });

  it("adminT(nav.dashboard, ja) は 'ダッシュボード'", () => {
    expect(adminT("nav.dashboard", "ja")).toBe("ダッシュボード");
  });

  it("adminT(nav.dashboard, en) は 'Dashboard'", () => {
    expect(adminT("nav.dashboard", "en")).toBe("Dashboard");
  });

  it("未知のロケールは ja にフォールバック", () => {
    expect(adminT("nav.dashboard", "vi")).toBe("ダッシュボード");
  });

  it("未知のキーはキー文字列をそのまま返す", () => {
    expect(adminT("nav.unknown.deep.key", "ja")).toBe("nav.unknown.deep.key");
  });

  it("英語辞書も nav 全項目が定義されている", () => {
    const en = getAdminDict("en");
    expect(en.nav.dashboard).toBe("Dashboard");
    expect(en.nav.applicants).toBe("Applicants");
    expect(en.nav.ai_reviews).toBe("AI output review");
    expect(en.common.save).toBe("Save");
  });
});
