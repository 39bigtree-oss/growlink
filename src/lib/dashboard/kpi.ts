import "server-only";

import { ApplicantStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ALL_STATUSES } from "@/lib/applicants/status-machine";

export type DashboardKpi = {
  todayApplicants: number;
  monthApplicants: number;
  diagnosisCompletionRate: number; // 0-100
  averageDiagnosisScore: number; // 0-100
  statusBreakdown: Array<{ status: ApplicantStatus; label: string; count: number }>;
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  RECEIVED: "受付",
  DIAGNOSED: "診断完了",
  SKILL_SHEET_INPROGRESS: "SS 作成中",
  SKILL_SHEET_DONE: "SS 完了",
  INTERVIEW_DONE: "面接完了",
  SALES_READY: "営業準備",
  IN_INTRODUCTION: "紹介中",
  CONTRACTED: "成約",
  REJECTED: "辞退",
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function loadDashboardKpi(now: Date = new Date()): Promise<DashboardKpi> {
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [todayCount, monthCount, totalCount, diagnosedCount, scoreAgg, byStatus] =
    await Promise.all([
      prisma.applicant.count({
        where: { deletedAt: null, createdAt: { gte: todayStart } },
      }),
      prisma.applicant.count({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
      }),
      prisma.applicant.count({
        where: { deletedAt: null, wantsDiagnosis: true },
      }),
      prisma.applicant.count({
        where: {
          deletedAt: null,
          wantsDiagnosis: true,
          diagnoses: { some: {} },
        },
      }),
      prisma.diagnosis.aggregate({ _avg: { score: true } }),
      prisma.applicant.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

  const counts = new Map<ApplicantStatus, number>();
  for (const row of byStatus) {
    counts.set(row.status, row._count._all);
  }
  const statusBreakdown = ALL_STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: counts.get(s) ?? 0,
  }));

  return {
    todayApplicants: todayCount,
    monthApplicants: monthCount,
    diagnosisCompletionRate: totalCount === 0 ? 0 : Math.round((diagnosedCount / totalCount) * 100),
    averageDiagnosisScore: scoreAgg._avg.score ?? 0,
    statusBreakdown,
  };
}
