import { describe, it, expect } from "vitest";

import { hasCapability, requireCapability, ForbiddenError, ALL_ROLES } from "@/lib/auth/rbac";

describe("hasCapability — spec.md §3.6 の権限マトリクス", () => {
  it("ADMIN は全権限を持つ", () => {
    expect(hasCapability("ADMIN", "applicants:read")).toBe(true);
    expect(hasCapability("ADMIN", "applicants:write")).toBe(true);
    expect(hasCapability("ADMIN", "applicants:approve")).toBe(true);
    expect(hasCapability("ADMIN", "facilities:write")).toBe(true);
    expect(hasCapability("ADMIN", "settings:write")).toBe(true);
  });

  it("CONSULTANT は設定だけ持たない", () => {
    expect(hasCapability("CONSULTANT", "applicants:write")).toBe(true);
    expect(hasCapability("CONSULTANT", "applicants:approve")).toBe(true);
    expect(hasCapability("CONSULTANT", "facilities:read")).toBe(true);
    expect(hasCapability("CONSULTANT", "facilities:write")).toBe(false);
    expect(hasCapability("CONSULTANT", "settings:read")).toBe(false);
    expect(hasCapability("CONSULTANT", "settings:write")).toBe(false);
  });

  it("SALES は申込閲覧と FAX 作成・送信のみ", () => {
    expect(hasCapability("SALES", "applicants:read")).toBe(true);
    expect(hasCapability("SALES", "applicants:write")).toBe(false);
    expect(hasCapability("SALES", "applicants:approve")).toBe(false);
    expect(hasCapability("SALES", "fax:read")).toBe(true);
    expect(hasCapability("SALES", "fax:create")).toBe(true);
    expect(hasCapability("SALES", "fax:send")).toBe(true);
    expect(hasCapability("SALES", "facilities:read")).toBe(true);
    expect(hasCapability("SALES", "facilities:write")).toBe(false);
  });

  it("VIEWER は閲覧のみ", () => {
    expect(hasCapability("VIEWER", "applicants:read")).toBe(true);
    expect(hasCapability("VIEWER", "facilities:read")).toBe(true);
    expect(hasCapability("VIEWER", "fax:read")).toBe(true);
    expect(hasCapability("VIEWER", "interviews:read")).toBe(true);
    expect(hasCapability("VIEWER", "applicants:write")).toBe(false);
    expect(hasCapability("VIEWER", "fax:create")).toBe(false);
    expect(hasCapability("VIEWER", "fax:send")).toBe(false);
    expect(hasCapability("VIEWER", "interviews:write")).toBe(false);
  });

  it("CONSULTANT は面接編集権を持つ、SALES は閲覧のみ", () => {
    expect(hasCapability("CONSULTANT", "interviews:write")).toBe(true);
    expect(hasCapability("SALES", "interviews:read")).toBe(true);
    expect(hasCapability("SALES", "interviews:write")).toBe(false);
  });

  it("不明 role は false", () => {
    expect(hasCapability(null, "applicants:read")).toBe(false);
    expect(hasCapability(undefined, "applicants:read")).toBe(false);
    expect(hasCapability("GUEST", "applicants:read")).toBe(false);
  });

  it("ALL_ROLES に挙げた全ロールで read 系は判定が決まる", () => {
    for (const r of ALL_ROLES) {
      const v = hasCapability(r, "applicants:read");
      expect(typeof v).toBe("boolean");
    }
  });

  it("requireCapability は権限不足で ForbiddenError を投げる", () => {
    expect(() => requireCapability("VIEWER", "applicants:write")).toThrow(ForbiddenError);
    expect(() => requireCapability("ADMIN", "applicants:write")).not.toThrow();
  });
});
