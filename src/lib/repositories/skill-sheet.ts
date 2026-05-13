import "server-only";

import type { Prisma, SkillSheet } from "@prisma/client";

import { prisma } from "@/lib/db";

export type UpsertSkillSheetInput = Omit<
  Prisma.SkillSheetUncheckedCreateInput,
  "id" | "updatedAt"
>;

export function upsertSkillSheet(input: UpsertSkillSheetInput): Promise<SkillSheet> {
  const { applicantId, ...rest } = input;
  return prisma.skillSheet.upsert({
    where: { applicantId },
    create: { applicantId, ...rest },
    update: rest,
  });
}

export function findSkillSheetByApplicant(applicantId: string) {
  return prisma.skillSheet.findUnique({ where: { applicantId } });
}

export function markSkillSheetCompleted(applicantId: string) {
  return prisma.skillSheet.update({
    where: { applicantId },
    data: { completedAt: new Date() },
  });
}
