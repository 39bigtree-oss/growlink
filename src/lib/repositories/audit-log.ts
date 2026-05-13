import "server-only";

import type { AuditLog, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateAuditLogInput = Omit<Prisma.AuditLogUncheckedCreateInput, "id" | "createdAt">;

export function recordAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  return prisma.auditLog.create({ data: input });
}

export function listAuditLogs(input: { staffId?: string; take?: number; skip?: number } = {}) {
  const { staffId, take = 100, skip = 0 } = input;
  return prisma.auditLog.findMany({
    where: { ...(staffId ? { staffId } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}
