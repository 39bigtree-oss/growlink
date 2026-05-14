/**
 * 会計ソフト (freee / Money Forward) 連携の provider 抽象。
 */
export type AccountingInvoiceInput = {
  invoiceNumber: string;
  facilityName: string;
  issuedAt: Date;
  dueAt: Date;
  amount: number;
  tax: number;
  totalAmount: number;
};

export interface AccountingProvider {
  name: string;
  createInvoice(input: AccountingInvoiceInput): Promise<{ externalId: string }>;
  markPaid(externalId: string, paidAt: Date): Promise<void>;
  exportCsv(range: { from: Date; to: Date }): Promise<string>;
}
