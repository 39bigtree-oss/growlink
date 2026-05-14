import { describe, expect, it } from "vitest";

import { applyRefund, calculateIntroductionFee, calculateTax } from "@/lib/billing/calc";
import { formatInvoiceNumber, parseInvoiceNumber } from "@/lib/billing/invoice-number";

describe("calculateIntroductionFee", () => {
  it("月収 400,000 円 × 30% → 1,440,000 円", () => {
    expect(calculateIntroductionFee({ monthlyWage: 400_000, feeRate: 0.3 })).toBe(1_440_000);
  });

  it("負の入力は 0", () => {
    expect(calculateIntroductionFee({ monthlyWage: -1, feeRate: 0.3 })).toBe(0);
    expect(calculateIntroductionFee({ monthlyWage: 100, feeRate: 0 })).toBe(0);
  });
});

describe("calculateTax", () => {
  it("税率 10% (default)", () => {
    expect(calculateTax(1_000_000)).toBe(100_000);
  });
  it("税率指定可能", () => {
    expect(calculateTax(1_000_000, 0.08)).toBe(80_000);
  });
});

describe("applyRefund", () => {
  const tiers = [
    { withinDays: 30, refundRate: 1.0 },
    { withinDays: 60, refundRate: 0.5 },
    { withinDays: 90, refundRate: 0.2 },
  ];

  it("入社から 15 日で退職 → 100% 返金", () => {
    const r = applyRefund({
      introductionFee: 1_000_000,
      startDate: new Date("2026-05-01"),
      attritionAt: new Date("2026-05-16"),
      tiers,
    });
    expect(r.withinDays).toBe(15);
    expect(r.tierApplied?.withinDays).toBe(30);
    expect(r.refundAmount).toBe(1_000_000);
  });

  it("入社から 45 日で退職 → 50% 返金", () => {
    const r = applyRefund({
      introductionFee: 1_000_000,
      startDate: new Date("2026-05-01"),
      attritionAt: new Date("2026-06-15"),
      tiers,
    });
    expect(r.withinDays).toBe(45);
    expect(r.tierApplied?.withinDays).toBe(60);
    expect(r.refundAmount).toBe(500_000);
  });

  it("入社から 100 日で退職 → 返金規定外 (0)", () => {
    const r = applyRefund({
      introductionFee: 1_000_000,
      startDate: new Date("2026-05-01"),
      attritionAt: new Date("2026-08-09"),
      tiers,
    });
    expect(r.withinDays).toBe(100);
    expect(r.tierApplied).toBe(null);
    expect(r.refundAmount).toBe(0);
  });

  it("tiers が逆順でも正しく適用される", () => {
    const r = applyRefund({
      introductionFee: 1_000_000,
      startDate: new Date("2026-05-01"),
      attritionAt: new Date("2026-05-10"),
      tiers: [...tiers].reverse(),
    });
    expect(r.tierApplied?.withinDays).toBe(30);
    expect(r.refundAmount).toBe(1_000_000);
  });
});

describe("invoice number format", () => {
  it("formatInvoiceNumber: zero pad", () => {
    expect(formatInvoiceNumber(2026, 5, 1)).toBe("INV-2026-05-0001");
    expect(formatInvoiceNumber(2026, 12, 9999)).toBe("INV-2026-12-9999");
  });

  it("parseInvoiceNumber: round trip", () => {
    expect(parseInvoiceNumber("INV-2026-05-0001")).toEqual({
      year: 2026,
      month: 5,
      seq: 1,
    });
  });

  it("parseInvoiceNumber: 不正形式は null", () => {
    expect(parseInvoiceNumber("XYZ-2026-05-0001")).toBeNull();
    expect(parseInvoiceNumber("INV-2026-13-0001")).toBeNull();
    expect(parseInvoiceNumber("INV-2026-05-1")).toBeNull();
  });

  it("formatInvoiceNumber: 範囲外で例外", () => {
    expect(() => formatInvoiceNumber(2026, 13, 1)).toThrow();
    expect(() => formatInvoiceNumber(1999, 5, 1)).toThrow();
    expect(() => formatInvoiceNumber(2026, 5, 0)).toThrow();
  });
});
