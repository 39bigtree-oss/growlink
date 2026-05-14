import "server-only";

import type { Prisma, RefundPolicy } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateRefundPolicyInput = Omit<
  Prisma.RefundPolicyUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

export function createRefundPolicy(input: CreateRefundPolicyInput): Promise<RefundPolicy> {
  return prisma.refundPolicy.create({ data: input });
}

export function findRefundPolicyById(id: string) {
  return prisma.refundPolicy.findUnique({
    where: { id },
    include: { contracts: { select: { id: true, facility: { select: { name: true } } } } },
  });
}

export function listRefundPolicies() {
  return prisma.refundPolicy.findMany({ orderBy: { createdAt: "desc" } });
}
