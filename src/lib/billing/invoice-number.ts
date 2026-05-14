/**
 * 請求書番号採番: INV-YYYY-MM-NNNN (NNNN は月内連番)
 *
 * 永続化は呼び出し側で行う想定 (Prisma で当月の最大連番 + 1 を取って渡す)。
 * 関数は純粋に文字列を組み立てるだけ。
 */
export function formatInvoiceNumber(year: number, month: number, seq: number): string {
  if (year < 2000 || year > 2999) throw new Error(`year out of range: ${year}`);
  if (month < 1 || month > 12) throw new Error(`month out of range: ${month}`);
  if (seq < 1 || seq > 9999) throw new Error(`seq out of range: ${seq}`);
  const m = String(month).padStart(2, "0");
  const s = String(seq).padStart(4, "0");
  return `INV-${year}-${m}-${s}`;
}

export function parseInvoiceNumber(
  invoiceNumber: string,
): { year: number; month: number; seq: number } | null {
  const m = /^INV-(\d{4})-(0[1-9]|1[0-2])-(\d{4})$/.exec(invoiceNumber);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), seq: Number(m[3]) };
}
