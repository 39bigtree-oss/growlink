import { describe, expect, it } from "vitest";

import { hasCapability } from "@/lib/auth/rbac";

/**
 * v1.5: Phase 6 内部システムで追加された capability の権限マトリクスを固定する。
 *
 *   ADMIN       — 全 Phase 6 capability を保持
 *   CONSULTANT  — 求人案件・契約閲覧・紹介成立 OK、my-number / audit / 請求書 NG
 *   SALES       — 求人案件・契約・請求書・紹介成立は閲覧のみ、my-number/audit NG
 *   VIEWER      — 求人案件閲覧のみ (社内検索者)
 *
 * マイナンバー (my-number:*) と監査ログ (audit:read) は ADMIN 専用。
 */
describe("Phase 6 RBAC マトリクス", () => {
  it("ADMIN は全 Phase 6 capability を持つ", () => {
    for (const cap of [
      "job-orders:read",
      "job-orders:write",
      "contracts:read",
      "contracts:write",
      "invoices:read",
      "invoices:write",
      "placements:read",
      "placements:write",
      "dispatch-ledger:read",
      "my-number:read",
      "my-number:write",
      "audit:read",
    ] as const) {
      expect(hasCapability("ADMIN", cap)).toBe(true);
    }
  });

  it("CONSULTANT は求人/契約/紹介の運用ができるが、請求書・my-number・監査は閲覧不可", () => {
    expect(hasCapability("CONSULTANT", "job-orders:read")).toBe(true);
    expect(hasCapability("CONSULTANT", "job-orders:write")).toBe(true);
    expect(hasCapability("CONSULTANT", "contracts:read")).toBe(true);
    expect(hasCapability("CONSULTANT", "contracts:write")).toBe(false);
    expect(hasCapability("CONSULTANT", "placements:write")).toBe(true);
    expect(hasCapability("CONSULTANT", "dispatch-ledger:read")).toBe(true);
    expect(hasCapability("CONSULTANT", "invoices:read")).toBe(false);
    expect(hasCapability("CONSULTANT", "my-number:read")).toBe(false);
    expect(hasCapability("CONSULTANT", "audit:read")).toBe(false);
  });

  it("SALES は求人案件・契約・請求書・紹介成立を閲覧、編集は不可", () => {
    expect(hasCapability("SALES", "job-orders:read")).toBe(true);
    expect(hasCapability("SALES", "job-orders:write")).toBe(false);
    expect(hasCapability("SALES", "contracts:read")).toBe(true);
    expect(hasCapability("SALES", "contracts:write")).toBe(false);
    expect(hasCapability("SALES", "invoices:read")).toBe(true);
    expect(hasCapability("SALES", "invoices:write")).toBe(false);
    expect(hasCapability("SALES", "placements:read")).toBe(true);
    expect(hasCapability("SALES", "dispatch-ledger:read")).toBe(false);
    expect(hasCapability("SALES", "my-number:read")).toBe(false);
    expect(hasCapability("SALES", "audit:read")).toBe(false);
  });

  it("VIEWER は求人案件の閲覧のみ", () => {
    expect(hasCapability("VIEWER", "job-orders:read")).toBe(true);
    expect(hasCapability("VIEWER", "contracts:read")).toBe(false);
    expect(hasCapability("VIEWER", "invoices:read")).toBe(false);
    expect(hasCapability("VIEWER", "placements:read")).toBe(false);
    expect(hasCapability("VIEWER", "my-number:read")).toBe(false);
    expect(hasCapability("VIEWER", "audit:read")).toBe(false);
  });

  it("my-number:write は ADMIN 専用", () => {
    expect(hasCapability("ADMIN", "my-number:write")).toBe(true);
    expect(hasCapability("CONSULTANT", "my-number:write")).toBe(false);
    expect(hasCapability("SALES", "my-number:write")).toBe(false);
    expect(hasCapability("VIEWER", "my-number:write")).toBe(false);
  });

  it("audit:read は ADMIN 専用 (改ざん検知の証跡保護)", () => {
    expect(hasCapability("ADMIN", "audit:read")).toBe(true);
    expect(hasCapability("CONSULTANT", "audit:read")).toBe(false);
    expect(hasCapability("SALES", "audit:read")).toBe(false);
    expect(hasCapability("VIEWER", "audit:read")).toBe(false);
  });
});
