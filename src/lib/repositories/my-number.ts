import "server-only";

import type { MyNumberAccessAction, MyNumberPurpose, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { encryptMyNumber } from "@/lib/compliance/my-number";

export type CreateMyNumberInput = {
  applicantId: string;
  plainNumber: string;
  purpose: MyNumberPurpose;
  retentionUntil: Date;
};

/**
 * 平文を受け取ったら即座に暗号化して DB に保存。平文は DB に絶対残さない。
 */
export async function upsertMyNumber(input: CreateMyNumberInput) {
  const encryptedNumber = encryptMyNumber(input.plainNumber);
  return prisma.myNumberRecord.upsert({
    where: { applicantId: input.applicantId },
    create: {
      applicantId: input.applicantId,
      encryptedNumber,
      encryptedAt: new Date(),
      purpose: input.purpose,
      retentionUntil: input.retentionUntil,
    },
    update: {
      encryptedNumber,
      encryptedAt: new Date(),
      purpose: input.purpose,
      retentionUntil: input.retentionUntil,
      deletedAt: null,
    },
  });
}

export function findMyNumberByApplicantId(applicantId: string) {
  return prisma.myNumberRecord.findUnique({
    where: { applicantId },
    include: {
      accessLogs: {
        orderBy: { accessedAt: "desc" },
        take: 50,
        include: { staff: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
}

export type ListMyNumbersInput = {
  take?: number;
  skip?: number;
};

export function listMyNumbers(input: ListMyNumbersInput = {}) {
  const { take = 100, skip = 0 } = input;
  return prisma.myNumberRecord.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: {
        select: { id: true, lastName: true, firstName: true, status: true },
      },
    },
    take,
    skip,
  });
}

export type AccessLogInput = {
  myNumberRecordId: string;
  staffId: string;
  action: MyNumberAccessAction;
  reason: string;
  ipAddress?: string | null;
};

export function recordMyNumberAccess(input: AccessLogInput) {
  return prisma.myNumberAccessLog.create({
    data: {
      myNumberRecordId: input.myNumberRecordId,
      staffId: input.staffId,
      action: input.action,
      reason: input.reason,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export function softDeleteMyNumber(applicantId: string) {
  return prisma.myNumberRecord.update({
    where: { applicantId },
    data: { deletedAt: new Date() },
  });
}

export type MyNumberWhere = Pick<Prisma.MyNumberRecordWhereInput, "deletedAt">;
