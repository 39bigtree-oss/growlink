import "server-only";

import { prisma } from "@/lib/db";

/**
 * 入社後 6 / 12 ヶ月生存率を計算する。
 *
 * 計算ルール:
 *   - "対象となる Placement" = 開始日から N ヶ月以上経過している (= 評価可能)
 *   - "生存" = N ヶ月経過時点で attritionAt が null か、または N ヶ月後より遅い退職日
 *
 * v1.8 はルールベース。退職実績データが十分溜まったら v2.0 で
 * Kaplan-Meier 曲線 / Cox 回帰に置換予定。
 */
export type SurvivalSnapshot = {
  windowMonths: number;
  evaluable: number;
  survivors: number;
  rate: number; // 0-1
};

const DAYS_PER_MONTH = 30.4375;

export async function computeSurvivalRate(
  windowMonths: number,
  now: Date = new Date(),
): Promise<SurvivalSnapshot> {
  const cutoff = new Date(now.getTime() - windowMonths * DAYS_PER_MONTH * 24 * 60 * 60 * 1000);
  // 対象: startDate <= cutoff
  const placements = await prisma.placement.findMany({
    where: { startDate: { lte: cutoff } },
    select: { startDate: true, attritionAt: true },
  });
  const evaluable = placements.length;
  if (evaluable === 0) {
    return { windowMonths, evaluable: 0, survivors: 0, rate: 0 };
  }
  const survivors = placements.filter((p) => {
    if (!p.attritionAt) return true;
    const threshold = new Date(
      p.startDate.getTime() + windowMonths * DAYS_PER_MONTH * 24 * 60 * 60 * 1000,
    );
    return p.attritionAt.getTime() >= threshold.getTime();
  }).length;
  return {
    windowMonths,
    evaluable,
    survivors,
    rate: survivors / evaluable,
  };
}

export async function computeSurvivalRates(): Promise<{
  m6: SurvivalSnapshot;
  m12: SurvivalSnapshot;
}> {
  const [m6, m12] = await Promise.all([
    computeSurvivalRate(6),
    computeSurvivalRate(12),
  ]);
  return { m6, m12 };
}
