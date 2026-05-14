import "server-only";

import type { Contract, ContractStatus, ContractType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateContractInput = Omit<
  Prisma.ContractUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateContractInput = Omit<
  Prisma.ContractUncheckedUpdateInput,
  "id" | "createdAt" | "updatedAt"
>;

export type ListContractsInput = {
  facilityId?: string;
  contractType?: ContractType;
  status?: ContractStatus;
  take?: number;
  skip?: number;
};

export function createContract(input: CreateContractInput): Promise<Contract> {
  return prisma.contract.create({ data: input });
}

export function updateContract(id: string, input: UpdateContractInput): Promise<Contract> {
  return prisma.contract.update({ where: { id }, data: input });
}

export function findContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: { facility: true, refundPolicy: true, placements: true },
  });
}

export function listContracts(input: ListContractsInput = {}) {
  const { facilityId, contractType, status, take = 50, skip = 0 } = input;
  const where: Prisma.ContractWhereInput = {
    ...(facilityId ? { facilityId } : {}),
    ...(contractType ? { contractType } : {}),
    ...(status ? { status } : {}),
  };
  return prisma.contract.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      facility: { select: { id: true, name: true } },
      refundPolicy: { select: { id: true, name: true } },
    },
    take,
    skip,
  });
}

export function countContracts(input: ListContractsInput = {}) {
  const { facilityId, contractType, status } = input;
  return prisma.contract.count({
    where: {
      ...(facilityId ? { facilityId } : {}),
      ...(contractType ? { contractType } : {}),
      ...(status ? { status } : {}),
    },
  });
}
