import "server-only";

import type { Interview, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateInterviewInput = Omit<Prisma.InterviewUncheckedCreateInput, "id">;
export type UpdateInterviewInput = Omit<
  Prisma.InterviewUncheckedUpdateInput,
  "id" | "applicantId"
>;

export function createInterview(input: CreateInterviewInput): Promise<Interview> {
  return prisma.interview.create({ data: input });
}

export function findInterviewByApplicant(applicantId: string) {
  return prisma.interview.findUnique({ where: { applicantId } });
}

export function findInterviewByCallSid(callSid: string) {
  return prisma.interview.findFirst({ where: { callSid } });
}

export function updateInterview(id: string, data: UpdateInterviewInput): Promise<Interview> {
  return prisma.interview.update({ where: { id }, data });
}
