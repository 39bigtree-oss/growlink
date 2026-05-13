import "server-only";

import type { Facility, FacilityCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateFacilityInput = Omit<Prisma.FacilityUncheckedCreateInput, "id" | "createdAt">;
export type UpdateFacilityInput = Omit<Prisma.FacilityUncheckedUpdateInput, "id" | "createdAt">;

export type ListFacilitiesInput = {
  category?: FacilityCategory;
  prefecture?: string;
  faxPublicOnly?: boolean;
  take?: number;
  skip?: number;
};

export function createFacility(input: CreateFacilityInput): Promise<Facility> {
  return prisma.facility.create({ data: input });
}

export function findFacilityById(id: string) {
  return prisma.facility.findUnique({ where: { id } });
}

export function listFacilities(input: ListFacilitiesInput = {}) {
  const { category, prefecture, faxPublicOnly, take = 50, skip = 0 } = input;
  return prisma.facility.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(prefecture ? { prefecture } : {}),
      ...(faxPublicOnly ? { isFaxPublic: true, fax: { not: null } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}

export function updateFacility(id: string, data: UpdateFacilityInput): Promise<Facility> {
  return prisma.facility.update({ where: { id }, data });
}

export function deleteFacility(id: string): Promise<Facility> {
  return prisma.facility.delete({ where: { id } });
}
