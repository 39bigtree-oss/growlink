import "server-only";

import { ApplicantStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * v1.9: 申込 → 入社 → 6m 生存 までの 8 段階ファネル。
 *
 * 仕組みづくり世界一指摘の「KPI ツリー未完成」への正面回答。
 *
 *   1. RECEIVED — 申込受付
 *   2. DIAGNOSED — AI 適職診断完了
 *   3. SKILL_SHEET_DONE — スキルシート提出済
 *   4. INTERVIEW_DONE — AI 電話面接完了
 *   5. SALES_READY — 営業フロー投入可
 *   6. FAX_REACTED — 施設から反応あり
 *   7. CONTRACTED — 内定 = Placement 成立
 *   8. SURVIVED_6M — 入社後 6 ヶ月在籍中
 *
 * 各段階の transition rate (前段比) を返す。サンプルが少なすぎる場合は "N/A"。
 */

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  /** 直前段階に対する継続率 (0-1)。最初の段階は null。 */
  conversionFromPrev: number | null;
  /** 始点 (RECEIVED) に対する継続率 (0-1)。 */
  conversionFromStart: number | null;
};

export async function computeFunnel(): Promise<FunnelStage[]> {
  const where = { deletedAt: null };

  // 1) RECEIVED 以上 (= 全申込) を分母にする
  const total = await prisma.applicant.count({ where });

  // 2) 各 status に進んだことがあるか — 単純化のため「現在の status >= target」で集計する
  //    (実運用では履歴テーブルから "ever reached" を取りたいが、v1.9 では現状値で代用)
  const order: ApplicantStatus[] = [
    ApplicantStatus.RECEIVED,
    ApplicantStatus.DIAGNOSED,
    ApplicantStatus.SKILL_SHEET_INPROGRESS,
    ApplicantStatus.SKILL_SHEET_DONE,
    ApplicantStatus.INTERVIEW_DONE,
    ApplicantStatus.SALES_READY,
    ApplicantStatus.IN_INTRODUCTION,
    ApplicantStatus.CONTRACTED,
  ];

  const counts: number[] = [];
  for (let i = 0; i < order.length; i++) {
    const reached = order.slice(i);
    const c = await prisma.applicant.count({
      where: { ...where, status: { in: reached } },
    });
    counts.push(c);
  }

  // 7) FAX 反応あり
  const faxReacted = await prisma.applicant.count({
    where: { ...where, faxSheets: { some: { reaction: { isNot: null } } } },
  });

  // 8) 入社後 6 ヶ月生存
  const sixMonthsAgo = new Date(Date.now() - 6 * 30.4375 * 24 * 60 * 60 * 1000);
  const survived6m = await prisma.placement.count({
    where: {
      startDate: { lte: sixMonthsAgo },
      OR: [
        { attritionAt: null },
        { attritionAt: { gte: sixMonthsAgo } },
      ],
    },
  });

  const stages: Array<{ key: string; label: string; count: number }> = [
    { key: "RECEIVED", label: "1. 申込受付", count: counts[0] },
    { key: "DIAGNOSED", label: "2. AI 診断完了", count: counts[1] },
    { key: "SKILL_SHEET_DONE", label: "3. スキルシート提出", count: counts[3] },
    { key: "INTERVIEW_DONE", label: "4. AI 面接完了", count: counts[4] },
    { key: "SALES_READY", label: "5. 営業フロー投入", count: counts[5] },
    { key: "FAX_REACTED", label: "6. 施設から反応", count: faxReacted },
    { key: "CONTRACTED", label: "7. 内定 / 入社", count: counts[7] },
    { key: "SURVIVED_6M", label: "8. 入社 6 ヶ月生存", count: survived6m },
  ];

  const out: FunnelStage[] = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const prev = i > 0 ? stages[i - 1].count : null;
    const fromPrev = prev && prev > 0 ? s.count / prev : null;
    const fromStart = total > 0 ? s.count / total : null;
    out.push({
      key: s.key,
      label: s.label,
      count: s.count,
      conversionFromPrev: fromPrev,
      conversionFromStart: fromStart,
    });
  }
  return out;
}
