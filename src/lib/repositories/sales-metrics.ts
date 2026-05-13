import "server-only";

import { prisma } from "@/lib/db";

export type FacilityResponseRow = {
  facilityId: string;
  facilityName: string;
  prefecture: string;
  category: string;
  sent: number;
  replied: number;
  interested: number;
  replyRate: number;
  interestedRate: number;
};

/**
 * 施設別の送信件数 / 返信率 / 興味あり率を集計する (Phase 4)。
 * - sent: 送信済 (SENT) の FaxSheet 数
 * - replied: 返信 (FaxReaction が存在する FaxSheet) の数
 * - interested: interested=true の FaxReaction 数
 */
export async function getFacilityResponseStats(limit = 50): Promise<FacilityResponseRow[]> {
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true, prefecture: true, category: true },
  });
  const facilityMap = new Map(facilities.map((f) => [f.id, f]));

  const sentGroups = await prisma.faxSheet.groupBy({
    by: ["facilityId"],
    where: { status: "SENT" },
    _count: { _all: true },
  });
  const sentMap = new Map(sentGroups.map((g) => [g.facilityId, g._count._all]));

  const reactionGroups = await prisma.faxReaction.groupBy({
    by: ["facilityId", "interested"],
    _count: { _all: true },
  });
  const replyMap = new Map<string, { replied: number; interested: number }>();
  for (const g of reactionGroups) {
    const row = replyMap.get(g.facilityId) ?? { replied: 0, interested: 0 };
    row.replied += g._count._all;
    if (g.interested) row.interested += g._count._all;
    replyMap.set(g.facilityId, row);
  }

  const rows: FacilityResponseRow[] = [];
  for (const fid of sentMap.keys()) {
    const fac = facilityMap.get(fid);
    if (!fac) continue;
    const sent = sentMap.get(fid) ?? 0;
    const rep = replyMap.get(fid) ?? { replied: 0, interested: 0 };
    rows.push({
      facilityId: fid,
      facilityName: fac.name,
      prefecture: fac.prefecture,
      category: fac.category,
      sent,
      replied: rep.replied,
      interested: rep.interested,
      replyRate: sent === 0 ? 0 : rep.replied / sent,
      interestedRate: sent === 0 ? 0 : rep.interested / sent,
    });
  }
  rows.sort((a, b) => b.sent - a.sent);
  return rows.slice(0, limit);
}

export type DailyMetricsRow = {
  date: string; // YYYY-MM-DD
  applications: number;
  faxSent: number;
  reactions: number;
};

/**
 * 過去 N 日の日次 KPI を返す。
 * recharts で線グラフにする想定で「日付の連続したベクタ」として埋め (0 含む)。
 */
export async function getDailyMetrics(days = 30): Promise<DailyMetricsRow[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    dates.push(toIsoDate(d));
  }

  const [apps, faxes, reactions] = await Promise.all([
    prisma.applicant.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.faxSheet.findMany({
      where: { sentAt: { gte: start, not: null }, status: "SENT" },
      select: { sentAt: true },
    }),
    prisma.faxReaction.findMany({
      where: { receivedAt: { gte: start } },
      select: { receivedAt: true },
    }),
  ]);

  const tally = new Map<string, DailyMetricsRow>(
    dates.map((d) => [d, { date: d, applications: 0, faxSent: 0, reactions: 0 }]),
  );
  for (const a of apps) {
    const row = tally.get(toIsoDate(a.createdAt));
    if (row) row.applications += 1;
  }
  for (const f of faxes) {
    if (!f.sentAt) continue;
    const row = tally.get(toIsoDate(f.sentAt));
    if (row) row.faxSent += 1;
  }
  for (const r of reactions) {
    const row = tally.get(toIsoDate(r.receivedAt));
    if (row) row.reactions += 1;
  }
  return dates.map((d) => tally.get(d)!);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type GlobalKpis = {
  totalApplicants: number;
  totalDiagnosed: number;
  totalSkillSheetDone: number;
  totalInterviewDone: number;
  totalSalesReady: number;
  totalContracted: number;
  totalFaxSent: number;
  totalReactions: number;
  totalInterested: number;
  replyRate: number;
  interestedRate: number;
  contractRate: number;
};

export async function getGlobalKpis(): Promise<GlobalKpis> {
  const [byStatus, faxSent, reactions, interested] = await Promise.all([
    prisma.applicant.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.faxSheet.count({ where: { status: "SENT" } }),
    prisma.faxReaction.count(),
    prisma.faxReaction.count({ where: { interested: true } }),
  ]);
  const total = byStatus.reduce((acc, b) => acc + b._count._all, 0);
  const pick = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const contracted = pick("CONTRACTED");
  return {
    totalApplicants: total,
    totalDiagnosed: pick("DIAGNOSED") + pick("SKILL_SHEET_INPROGRESS") + pick("SKILL_SHEET_DONE") + pick("INTERVIEW_DONE") + pick("SALES_READY") + pick("IN_INTRODUCTION") + contracted,
    totalSkillSheetDone: pick("SKILL_SHEET_DONE") + pick("INTERVIEW_DONE") + pick("SALES_READY") + pick("IN_INTRODUCTION") + contracted,
    totalInterviewDone: pick("INTERVIEW_DONE") + pick("SALES_READY") + pick("IN_INTRODUCTION") + contracted,
    totalSalesReady: pick("SALES_READY") + pick("IN_INTRODUCTION") + contracted,
    totalContracted: contracted,
    totalFaxSent: faxSent,
    totalReactions: reactions,
    totalInterested: interested,
    replyRate: faxSent === 0 ? 0 : reactions / faxSent,
    interestedRate: faxSent === 0 ? 0 : interested / faxSent,
    contractRate: total === 0 ? 0 : contracted / total,
  };
}
