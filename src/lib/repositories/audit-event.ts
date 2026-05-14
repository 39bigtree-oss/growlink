import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ListAuditEventsInput = {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorStaffId?: string;
  take?: number;
  skip?: number;
};

export function listAuditEvents(input: ListAuditEventsInput = {}) {
  const { action, entityType, entityId, actorStaffId, take = 200, skip = 0 } = input;
  const where: Prisma.AuditEventWhereInput = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorStaffId ? { actorStaffId } : {}),
  };
  return prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    take,
    skip,
  });
}

export function countAuditEvents(input: ListAuditEventsInput = {}) {
  const { action, entityType, entityId, actorStaffId } = input;
  return prisma.auditEvent.count({
    where: {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorStaffId ? { actorStaffId } : {}),
    },
  });
}

/**
 * チェーン全件を createdAt ASC で取得。verifyChain に渡す用。
 * 件数が多い場合は時間範囲フィルタを追加する想定 (v1.6+)。
 */
export function listAuditEventsForVerification() {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      actorStaffId: true,
      actorEmail: true,
      action: true,
      entityType: true,
      entityId: true,
      before: true,
      after: true,
      ipAddress: true,
      userAgent: true,
      requestId: true,
      prevHash: true,
      hash: true,
    },
  });
}
