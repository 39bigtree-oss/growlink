import type { RefundTier } from "@/lib/schemas/contract";

/**
 * 紹介手数料 = (理論年収) × feeRate。
 *
 *   理論年収 = monthlyWage × 12
 *   feeRate  = 0.30 (30%) など
 *
 * 派遣形態の場合は、別途 calculateDispatchFee (時給ベース) を使う想定だが、
 * v1.4 では紹介 (INTRODUCTION_FEE) のみ実装。派遣手数料計算は v1.5+ で。
 */
export function calculateIntroductionFee(args: {
  monthlyWage: number; // 円 (税込)
  feeRate: number; // 0〜1 の小数
}): number {
  const { monthlyWage, feeRate } = args;
  if (monthlyWage <= 0 || feeRate <= 0) return 0;
  return Math.round(monthlyWage * 12 * feeRate);
}

/**
 * 早期退職時の返金額を返金規定 (段階適用) で計算する。
 *
 * tiers 例: [
 *   { withinDays: 30, refundRate: 1.0 },   // 30 日以内退職: 100% 返金
 *   { withinDays: 60, refundRate: 0.5 },   // 60 日以内退職: 50% 返金
 *   { withinDays: 90, refundRate: 0.2 },   // 90 日以内退職: 20% 返金
 * ]
 *
 * withinDays は ASC で評価し、最初に当てはまった tier を採用。
 * (tiers が逆順や歯抜けでも startup 側で sort してから来る前提)
 */
export function applyRefund(args: {
  introductionFee: number;
  startDate: Date;
  attritionAt: Date;
  tiers: RefundTier[];
}): {
  refundAmount: number;
  withinDays: number;
  tierApplied: RefundTier | null;
} {
  const { introductionFee, startDate, attritionAt, tiers } = args;
  const ms = attritionAt.getTime() - startDate.getTime();
  const withinDays = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));

  const sorted = [...tiers].sort((a, b) => a.withinDays - b.withinDays);
  const tier = sorted.find((t) => withinDays <= t.withinDays) ?? null;
  const refundAmount = tier ? Math.round(introductionFee * tier.refundRate) : 0;
  return { refundAmount, withinDays, tierApplied: tier };
}

/**
 * 消費税 (10%) を計算 (内税ではなく外税)。
 * v1.5 で軽減税率対応の場合は別関数 (`calculateTaxReduced`) を切り出す。
 */
export function calculateTax(amount: number, rate = 0.1): number {
  return Math.round(amount * rate);
}
