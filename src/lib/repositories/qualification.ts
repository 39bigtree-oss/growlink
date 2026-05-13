import "server-only";

import type { Prisma, Qualification } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateQualificationInput = Omit<Prisma.QualificationUncheckedCreateInput, "id">;

export function createQualification(input: CreateQualificationInput): Promise<Qualification> {
  return prisma.qualification.create({ data: input });
}

export function listQualificationsByApplicant(applicantId: string) {
  return prisma.qualification.findMany({
    where: { applicantId },
    orderBy: { acquiredOn: "desc" },
  });
}

export function replaceQualificationsForApplicant(
  applicantId: string,
  rows: Array<Omit<CreateQualificationInput, "applicantId">>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.qualification.deleteMany({ where: { applicantId } });
    if (rows.length === 0) return [];
    return tx.qualification.createManyAndReturn({
      data: rows.map((r) => ({ ...r, applicantId })),
    });
  });
}

export function deleteQualification(id: string) {
  return prisma.qualification.delete({ where: { id } });
}
