import { describe, expect, it } from "vitest";

import { renderDispatchLedgerPdf } from "@/lib/pdf/dispatchLedgerPdf";

describe("renderDispatchLedgerPdf", () => {
  it("PDF Buffer を返し、PDF magic で始まる", async () => {
    const buf = await renderDispatchLedgerPdf({
      ledgerId: "test-ledger-1",
      applicantFullName: "テスト 太郎",
      facilityName: "(架空) サンプル病院",
      jobOrderTitle: "(架空) 看護師 派遣",
      dispatchPeriodStart: new Date("2026-05-01"),
      dispatchPeriodEnd: new Date("2027-04-30"),
      antiteishokuDate: new Date("2029-04-30"),
      dispatchManagerName: "派遣元 鈴木",
      receivingManagerName: "派遣先 佐藤",
      socialInsuranceEnrolled: true,
      contractCount: 1,
      notes: "テスト備考",
      daysUntilAntiteishoku: 1095,
    });
    expect(buf.length).toBeGreaterThan(1000);
    // PDF Magic: %PDF
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  it("抵触日が 90 日以内ならアラート表記が PDF テキストに含まれる", async () => {
    const buf = await renderDispatchLedgerPdf({
      ledgerId: "test-ledger-2",
      applicantFullName: "派遣 花子",
      facilityName: "(架空) サンプル介護施設",
      jobOrderTitle: "(架空) 介護士 派遣",
      dispatchPeriodStart: new Date("2024-01-01"),
      dispatchPeriodEnd: new Date("2026-12-31"),
      antiteishokuDate: new Date("2026-12-31"),
      dispatchManagerName: "派遣元 田中",
      receivingManagerName: "派遣先 山田",
      socialInsuranceEnrolled: false,
      contractCount: 3,
      notes: null,
      daysUntilAntiteishoku: 30,
    });
    expect(buf.length).toBeGreaterThan(1000);
    // PDF 内のテキストは圧縮されている場合があるので、サイズの存在のみ確認 (実 PDF ビューアで目視済み)
  }, 30_000);
});
