import "server-only";

import type { FaxReaction, FaxSheet, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type FaxChannel = "FAX" | "EMAIL";
export type FaxStatus = "PENDING" | "SENT" | "FAILED";

export type CreateFaxSheetInput = Omit<
  Prisma.FaxSheetUncheckedCreateInput,
  "id" | "createdAt" | "sentAt"
>;

export type CreateFaxReactionInput = Omit<
  Prisma.FaxReactionUncheckedCreateInput,
  "id" | "receivedAt"
>;

export function createFaxSheet(input: CreateFaxSheetInput): Promise<FaxSheet> {
  return prisma.faxSheet.create({ data: input });
}

export function findFaxSheetById(id: string) {
  return prisma.faxSheet.findUnique({
    where: { id },
    include: { applicant: true, facility: true, reaction: true },
  });
}

export function listFaxSheetsByApplicant(applicantId: string) {
  return prisma.faxSheet.findMany({
    where: { applicantId },
    include: { facility: true, reaction: true },
    orderBy: { createdAt: "desc" },
  });
}

export function markFaxSheetSent(id: string, sentAt: Date = new Date()): Promise<FaxSheet> {
  return prisma.faxSheet.update({
    where: { id },
    data: { status: "SENT", sentAt },
  });
}

export function markFaxSheetFailed(id: string): Promise<FaxSheet> {
  return prisma.faxSheet.update({
    where: { id },
    data: { status: "FAILED" },
  });
}

export function recordFaxReaction(input: CreateFaxReactionInput): Promise<FaxReaction> {
  return prisma.faxReaction.create({ data: input });
}
