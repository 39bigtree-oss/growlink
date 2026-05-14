import "server-only";

import type { Invoice, InvoiceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateInvoiceInput = Omit<
  Prisma.InvoiceUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

export type ListInvoicesInput = {
  facilityId?: string;
  status?: InvoiceStatus;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
};

export function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  return prisma.invoice.create({ data: input });
}

export function markInvoicePaid(id: string, paidAt: Date) {
  return prisma.invoice.update({
    where: { id },
    data: { paidAt, status: "PAID" },
  });
}

export function findInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      facility: true,
      placement: { include: { applicant: { select: { lastName: true, firstName: true } } } },
    },
  });
}

export function listInvoices(input: ListInvoicesInput = {}) {
  const { facilityId, status, from, to, take = 100, skip = 0 } = input;
  const where: Prisma.InvoiceWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { issuedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  return prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    include: { facility: { select: { id: true, name: true } } },
    take,
    skip,
  });
}

export function countInvoices(input: ListInvoicesInput = {}) {
  const { facilityId, status, from, to } = input;
  return prisma.invoice.count({
    where: {
      ...(facilityId ? { facilityId } : {}),
      ...(status ? { status } : {}),
      ...(from || to
        ? { issuedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
  });
}

export async function sumInvoiceTotals(input: ListInvoicesInput = {}): Promise<{
  issuedAmount: number;
  paidAmount: number;
  overdueAmount: number;
}> {
  const { facilityId, from, to } = input;
  const base: Prisma.InvoiceWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(from || to
      ? { issuedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };
  const [issued, paid, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...base, status: { in: ["ISSUED", "PAID", "OVERDUE"] } },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({ where: { ...base, status: "PAID" }, _sum: { totalAmount: true } }),
    prisma.invoice.aggregate({
      where: { ...base, status: "OVERDUE" },
      _sum: { totalAmount: true },
    }),
  ]);
  return {
    issuedAmount: Number(issued._sum.totalAmount ?? 0),
    paidAmount: Number(paid._sum.totalAmount ?? 0),
    overdueAmount: Number(overdue._sum.totalAmount ?? 0),
  };
}
