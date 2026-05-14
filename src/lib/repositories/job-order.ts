import "server-only";

import type { JobOrder, JobOrderStatus, JobPosition, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateJobOrderInput = Omit<
  Prisma.JobOrderUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateJobOrderInput = Omit<
  Prisma.JobOrderUncheckedUpdateInput,
  "id" | "createdAt" | "updatedAt"
>;

export type ListJobOrdersInput = {
  facilityId?: string;
  status?: JobOrderStatus;
  position?: JobPosition;
  q?: string;
  take?: number;
  skip?: number;
};

export function createJobOrder(input: CreateJobOrderInput): Promise<JobOrder> {
  return prisma.jobOrder.create({ data: input });
}

export function updateJobOrder(id: string, input: UpdateJobOrderInput): Promise<JobOrder> {
  return prisma.jobOrder.update({ where: { id }, data: input });
}

export function findJobOrderById(id: string) {
  return prisma.jobOrder.findUnique({
    where: { id },
    include: {
      facility: true,
      placements: { include: { applicant: { select: { lastName: true, firstName: true } } } },
    },
  });
}

export function listJobOrders(input: ListJobOrdersInput = {}) {
  const { facilityId, status, position, q, take = 50, skip = 0 } = input;
  const where: Prisma.JobOrderWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(status ? { status } : {}),
    ...(position ? { position } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { facility: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return prisma.jobOrder.findMany({
    where,
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    include: { facility: { select: { id: true, name: true, prefecture: true, city: true } } },
    take,
    skip,
  });
}

export function countJobOrders(input: ListJobOrdersInput = {}) {
  const { facilityId, status, position, q } = input;
  return prisma.jobOrder.count({
    where: {
      ...(facilityId ? { facilityId } : {}),
      ...(status ? { status } : {}),
      ...(position ? { position } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { facility: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
  });
}

/** マッチングで「OPEN な案件すべて」を返す軽量版。詳細は呼び出し側で。 */
export function listOpenJobOrdersForMatching() {
  return prisma.jobOrder.findMany({
    where: { status: "OPEN" },
    include: {
      facility: { select: { id: true, name: true, prefecture: true, city: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
  });
}
