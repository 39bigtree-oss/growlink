import "server-only";

import type { Diagnosis, FacilityCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type UpsertDiagnosisInput = Omit<
  Prisma.DiagnosisUncheckedCreateInput,
  "id" | "generatedAt"
>;

export function upsertDiagnosis(input: UpsertDiagnosisInput): Promise<Diagnosis> {
  const { applicantId, category, ...rest } = input;
  return prisma.diagnosis.upsert({
    where: { applicantId_category: { applicantId, category } },
    create: { applicantId, category, ...rest },
    update: { ...rest, generatedAt: new Date() },
  });
}

export function listDiagnosesByApplicant(applicantId: string) {
  return prisma.diagnosis.findMany({
    where: { applicantId },
    orderBy: { score: "desc" },
  });
}

export function findDiagnosis(applicantId: string, category: FacilityCategory) {
  return prisma.diagnosis.findUnique({
    where: { applicantId_category: { applicantId, category } },
  });
}

export function deleteDiagnosesByApplicant(applicantId: string) {
  return prisma.diagnosis.deleteMany({ where: { applicantId } });
}
