import "server-only";

import type { Prisma } from "@prisma/client";
import { ApplicantStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ALL_STATUSES } from "./status-machine";

export const APPLICANTS_PAGE_SIZE = 20;

export type ApplicantListFilter = {
  status?: ApplicantStatus | "ALL";
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  page?: number; // 1-based
};

export function parseApplicantListFilter(
  search: Record<string, string | string[] | undefined>,
): ApplicantListFilter {
  const get = (k: string): string | undefined => {
    const v = search[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const statusRaw = get("status");
  const status =
    statusRaw && (ALL_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as ApplicantStatus)
      : statusRaw === "ALL"
        ? "ALL"
        : undefined;
  const pageRaw = get("page");
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1;
  return {
    status,
    q: get("q")?.trim() || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    page,
  };
}

export type ApplicantListItem = {
  id: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  gender: import("@prisma/client").Gender;
  birthDate: Date;
  desiredCategories: import("@prisma/client").FacilityCategory[];
  status: ApplicantStatus;
  wantsDiagnosis: boolean;
  createdAt: Date;
};

export type ApplicantListPage = {
  items: ApplicantListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function queryApplicants(filter: ApplicantListFilter): Promise<ApplicantListPage> {
  const where: Prisma.ApplicantWhereInput = { deletedAt: null };
  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }
  if (filter.q) {
    where.OR = [
      { lastName: { contains: filter.q } },
      { firstName: { contains: filter.q } },
      { lastNameKana: { contains: filter.q } },
      { firstNameKana: { contains: filter.q } },
      { email: { contains: filter.q, mode: "insensitive" } },
    ];
  }
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) {
      where.createdAt.gte = new Date(`${filter.from}T00:00:00`);
    }
    if (filter.to) {
      where.createdAt.lte = new Date(`${filter.to}T23:59:59`);
    }
  }

  const page = filter.page ?? 1;
  const skip = (page - 1) * APPLICANTS_PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.applicant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: APPLICANTS_PAGE_SIZE,
      select: {
        id: true,
        lastName: true,
        firstName: true,
        lastNameKana: true,
        firstNameKana: true,
        email: true,
        gender: true,
        birthDate: true,
        desiredCategories: true,
        status: true,
        wantsDiagnosis: true,
        createdAt: true,
      },
    }),
    prisma.applicant.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: APPLICANTS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / APPLICANTS_PAGE_SIZE)),
  };
}

export function ageFromBirthDate(birth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
