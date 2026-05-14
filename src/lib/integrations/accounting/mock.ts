import "server-only";

import { randomBytes } from "node:crypto";

import type { AccountingInvoiceInput, AccountingProvider } from "./types";

/**
 * 会計連携 mock provider。freee / Money Forward の差し替え予定。
 *
 * createInvoice → externalId を払い出し、メモリに保持
 * markPaid      → status: paid に遷移 (paidAt 記録)
 * exportCsv     → 期間内の請求書を CSV 文字列で返す
 */
type State = {
  externalId: string;
  input: AccountingInvoiceInput;
  paidAt: Date | null;
};

const STATE: Map<string, State> = new Map();

export function _resetAccountingMockState(): void {
  STATE.clear();
}

export const mockAccountingProvider: AccountingProvider = {
  name: "accounting:mock",
  async createInvoice(input: AccountingInvoiceInput): Promise<{ externalId: string }> {
    const externalId = `mock-acc-${Date.now()}-${randomBytes(3).toString("hex")}`;
    STATE.set(externalId, { externalId, input, paidAt: null });
    console.log("[accounting:mock] 請求書登録", {
      externalId,
      invoiceNumber: input.invoiceNumber,
      total: input.totalAmount,
    });
    return { externalId };
  },
  async markPaid(externalId: string, paidAt: Date): Promise<void> {
    const s = STATE.get(externalId);
    if (!s) throw new Error(`Invoice not found: ${externalId}`);
    s.paidAt = paidAt;
  },
  async exportCsv(range: { from: Date; to: Date }): Promise<string> {
    const rows = [
      "invoice_number,issued_at,due_at,total,paid_at,external_id",
    ];
    for (const s of STATE.values()) {
      const t = s.input.issuedAt.getTime();
      if (t >= range.from.getTime() && t <= range.to.getTime()) {
        rows.push(
          [
            s.input.invoiceNumber,
            s.input.issuedAt.toISOString(),
            s.input.dueAt.toISOString(),
            s.input.totalAmount,
            s.paidAt?.toISOString() ?? "",
            s.externalId,
          ].join(","),
        );
      }
    }
    return rows.join("\n");
  },
};
