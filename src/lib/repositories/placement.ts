import "server-only";

import type { PlacementFeeStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ListPlacementsInput = {
  facilityId?: string;
  applicantId?: string;
  feeStatus?: PlacementFeeStatus;
  take?: number;
  skip?: number;
};

export function findPlacementById(id: string) {
  return prisma.placement.findUnique({
    where: { id },
    include: {
      applicant: { select: { id: true, lastName: true, firstName: true, email: true } },
      facility: true,
      jobOrder: true,
      contract: { include: { refundPolicy: true } },
      invoices: true,
      dispatchLedger: true,
    },
  });
}

export function listPlacements(input: ListPlacementsInput = {}) {
  const { facilityId, applicantId, feeStatus, take = 100, skip = 0 } = input;
  const where: Prisma.PlacementWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(applicantId ? { applicantId } : {}),
    ...(feeStatus ? { feeStatus } : {}),
  };
  return prisma.placement.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      applicant: { select: { id: true, lastName: true, firstName: true } },
      facility: { select: { id: true, name: true } },
      jobOrder: { select: { id: true, title: true } },
    },
    take,
    skip,
  });
}

export function countPlacements(input: ListPlacementsInput = {}) {
  const { facilityId, applicantId, feeStatus } = input;
  return prisma.placement.count({
    where: {
      ...(facilityId ? { facilityId } : {}),
      ...(applicantId ? { applicantId } : {}),
      ...(feeStatus ? { feeStatus } : {}),
    },
  });
}
