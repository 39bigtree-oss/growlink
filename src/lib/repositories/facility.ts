import "server-only";

import type { Facility, FacilityCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type CreateFacilityInput = Omit<Prisma.FacilityUncheckedCreateInput, "id" | "createdAt">;
export type UpdateFacilityInput = Omit<Prisma.FacilityUncheckedUpdateInput, "id" | "createdAt">;

export type ListFacilitiesInput = {
  category?: FacilityCategory;
  prefecture?: string;
  /** 市区町村による絞り込み (Phase 4)。部分一致。 */
  city?: string;
  /** 施設名 / 住所のフリーテキスト検索 (Phase 4)。AND ではなく OR で当てる。 */
  q?: string;
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
  const { category, prefecture, city, q, faxPublicOnly, take = 50, skip = 0 } = input;
  const where: Prisma.FacilityWhereInput = {
    ...(category ? { category } : {}),
    ...(prefecture ? { prefecture } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(faxPublicOnly ? { isFaxPublic: true, fax: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return prisma.facility.findMany({ where, orderBy: { createdAt: "desc" }, take, skip });
}

export function countFacilities(input: ListFacilitiesInput = {}) {
  const { category, prefecture, city, q, faxPublicOnly } = input;
  return prisma.facility.count({
    where: {
      ...(category ? { category } : {}),
      ...(prefecture ? { prefecture } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(faxPublicOnly ? { isFaxPublic: true, fax: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  });
}

export function updateFacility(id: string, data: UpdateFacilityInput): Promise<Facility> {
  return prisma.facility.update({ where: { id }, data });
}

export function deleteFacility(id: string): Promise<Facility> {
  return prisma.facility.delete({ where: { id } });
}
