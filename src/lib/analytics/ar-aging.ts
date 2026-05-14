import "server-only";

import { prisma } from "@/lib/db";

/**
 * v1.9: 売掛 (Accounts Receivable) Aging。
 *
 *   未入金 Invoice を「経過日数」別にバケット分け:
 *     - 0-30 日:   通常 (支払期日前)
 *     - 31-60 日:  督促開始
 *     - 61-90 日:  強い督促
 *     - 90 日超:   要法的対応
 *
 * 経過日数の基準: now - dueAt。
 * 平均回収日数 (DSO: Days Sales Outstanding) も併せて算出。
 */

export type AgingBucket = "current" | "30" | "60" | "90" | "90plus";

export type AgingRow = {
  bucket: AgingBucket;
  label: string;
  count: number;
  totalAmount: number;
};

export type AgingSummary = {
  buckets: AgingRow[];
  totalUnpaid: number;
  dsoDays: number | null;
};

const LABELS: Record<AgingBucket, string> = {
  current: "支払期日前",
  "30": "1〜30 日延滞",
  "60": "31〜60 日延滞",
  "90": "61〜90 日延滞",
  "90plus": "90 日超延滞 (要対応)",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "30";
  if (daysOverdue <= 60) return "60";
  if (daysOverdue <= 90) return "90";
  return "90plus";
}

export async function computeArAging(now: Date = new Date()): Promise<AgingSummary> {
  // 入金前: ISSUED or OVERDUE
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "OVERDUE"] } },
    select: { dueAt: true, totalAmount: true, issuedAt: true, paidAt: true },
  });

  const tallies: Record<AgingBucket, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    "30": { count: 0, total: 0 },
    "60": { count: 0, total: 0 },
    "90": { count: 0, total: 0 },
    "90plus": { count: 0, total: 0 },
  };
  let unpaidSum = 0;
  for (const inv of invoices) {
    const days = Math.floor((now.getTime() - inv.dueAt.getTime()) / MS_PER_DAY);
    const bucket = bucketFor(days);
    tallies[bucket].count += 1;
    tallies[bucket].total += Number(inv.totalAmount);
    unpaidSum += Number(inv.totalAmount);
  }

  // DSO: 直近 90 日に PAID になった請求書の「発行 → 入金」までの平均日数
  const paidRecently = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: new Date(now.getTime() - 90 * MS_PER_DAY) },
    },
    select: { issuedAt: true, paidAt: true },
  });
  let dso: number | null = null;
  if (paidRecently.length > 0) {
    const days = paidRecently.map((p) =>
      p.paidAt ? (p.paidAt.getTime() - p.issuedAt.getTime()) / MS_PER_DAY : 0,
    );
    dso = days.reduce((a, b) => a + b, 0) / days.length;
  }

  const buckets: AgingRow[] = (
    ["current", "30", "60", "90", "90plus"] as const
  ).map((b) => ({
    bucket: b,
    label: LABELS[b],
    count: tallies[b].count,
    totalAmount: tallies[b].total,
  }));

  return {
    buckets,
    totalUnpaid: unpaidSum,
    dsoDays: dso !== null ? Math.round(dso * 10) / 10 : null,
  };
}
