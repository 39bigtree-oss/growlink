/**
 * 派遣業法の "事業所単位での 3 年ルール" に基づく抵触日を計算する。
 *
 *   抵触日 = 派遣開始日 + 3 年 - 1 日
 *
 * 例: 2024-04-01 開始 → 抵触日 = 2027-03-31
 *
 * うるう年の境界 (2/29 開始 → 3 年後の 2/29 が無い場合) は JavaScript Date が
 * 自動で 3/1 にロールするため、その挙動を保つ。実運用では発生しないが
 * テストで挙動を固定しておく。
 */
export function calcAntiteishokuDate(dispatchPeriodStart: Date): Date {
  const d = new Date(dispatchPeriodStart);
  d.setFullYear(d.getFullYear() + 3);
  d.setDate(d.getDate() - 1);
  return d;
}

/** 残り日数。負の値は既に抵触日を過ぎている。 */
export function daysUntilAntiteishoku(target: Date, now: Date = new Date()): number {
  const ms = target.getTime() - now.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/** thresholdDays 以下になったら "接近中" としてアラート対象に。 */
export function isApproachingAntiteishoku(
  target: Date,
  now: Date = new Date(),
  thresholdDays = 90,
): boolean {
  const remaining = daysUntilAntiteishoku(target, now);
  return remaining >= 0 && remaining <= thresholdDays;
}
