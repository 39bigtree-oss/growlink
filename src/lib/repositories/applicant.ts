import "server-only";

import type { Applicant, ApplicantStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateApplicantInput = Omit<
  Prisma.ApplicantUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt" | "status" | "deletedAt"
> & {
  status?: ApplicantStatus;
};

export type UpdateApplicantInput = Omit<
  Prisma.ApplicantUncheckedUpdateInput,
  "id" | "createdAt" | "updatedAt"
>;

export type ListApplicantsInput = {
  status?: ApplicantStatus;
  includeDeleted?: boolean;
  take?: number;
  skip?: number;
};

export function createApplicant(input: CreateApplicantInput): Promise<Applicant> {
  return prisma.applicant.create({ data: input });
}

export function findApplicantById(
  id: string,
  options: { includeDeleted?: boolean } = {},
) {
  return prisma.applicant.findFirst({
    where: { id, ...(options.includeDeleted ? {} : { deletedAt: null }) },
    include: {
      qualifications: true,
      diagnoses: true,
      skillSheet: true,
      interview: true,
    },
  });
}

export function findApplicantByEmail(email: string) {
  return prisma.applicant.findFirst({
    where: { email, deletedAt: null },
  });
}

export function listApplicants(input: ListApplicantsInput = {}) {
  const { status, includeDeleted = false, take = 50, skip = 0 } = input;
  return prisma.applicant.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}

export function updateApplicant(id: string, data: UpdateApplicantInput): Promise<Applicant> {
  return prisma.applicant.update({ where: { id }, data });
}

export function updateApplicantStatus(id: string, status: ApplicantStatus): Promise<Applicant> {
  return prisma.applicant.update({ where: { id }, data: { status } });
}

// 求職者の削除申出を受け付けたときに呼ぶ。物理削除はバッチが30日後に行う。
export function softDeleteApplicant(id: string): Promise<Applicant> {
  return prisma.applicant.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function hardDeleteApplicant(id: string): Promise<Applicant> {
  return prisma.applicant.delete({ where: { id } });
}
