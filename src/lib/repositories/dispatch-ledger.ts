import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ListDispatchLedgersInput = {
  facilityId?: string;
  applicantId?: string;
  /** 抵触日 N 日以内のみ (アラート用) */
  approachingDays?: number;
  take?: number;
  skip?: number;
};

export function findDispatchLedgerById(id: string) {
  return prisma.dispatchLedger.findUnique({
    where: { id },
    include: {
      placement: true,
      applicant: { select: { id: true, lastName: true, firstName: true } },
      facility: true,
      jobOrder: true,
    },
  });
}

export function listDispatchLedgers(input: ListDispatchLedgersInput = {}) {
  const { facilityId, applicantId, approachingDays, take = 100, skip = 0 } = input;
  const where: Prisma.DispatchLedgerWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(applicantId ? { applicantId } : {}),
    ...(approachingDays !== undefined
      ? {
          antiteishokuDate: {
            gte: new Date(),
            lte: new Date(Date.now() + approachingDays * 24 * 60 * 60 * 1000),
          },
        }
      : {}),
  };
  return prisma.dispatchLedger.findMany({
    where,
    orderBy: { antiteishokuDate: "asc" },
    include: {
      applicant: { select: { id: true, lastName: true, firstName: true } },
      facility: { select: { id: true, name: true } },
      jobOrder: { select: { id: true, title: true } },
    },
    take,
    skip,
  });
}

export function countDispatchLedgers(input: ListDispatchLedgersInput = {}) {
  const { facilityId, applicantId } = input;
  return prisma.dispatchLedger.count({
    where: {
      ...(facilityId ? { facilityId } : {}),
      ...(applicantId ? { applicantId } : {}),
    },
  });
}
