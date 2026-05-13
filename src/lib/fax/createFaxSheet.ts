import "server-only";

import type { FaxSheet } from "@prisma/client";

import { buildFaxBody } from "@/lib/ai/fax/buildFaxBody";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { prisma } from "@/lib/db";
import { maskApplicantForFax } from "@/lib/mask";
import { renderFaxSheetPdf } from "@/lib/pdf/faxSheetPdf";
import { saveObject } from "@/lib/storage/local";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

const ORG = {
  name: "株式会社グロウリンク",
  contact: "https://growlink.example / info@growlink.example",
  replyFax: "03-0000-0000",
};

export type CreateFaxSheetResult = {
  faxSheet: FaxSheet;
  pdfKey: string;
  provider: string;
};

export type CreateFaxSheetError = {
  applicantId: string;
  facilityId: string;
  error: string;
};

/**
 * Phase 1-7 のコア。1 件分の FaxSheet を生成して DB と storage に保存する。
 * 既存の同一 (applicantId, facilityId) は status を保ったまま PDF だけ再生成 (upsert)。
 */
export async function createFaxSheet(
  applicantId: string,
  facilityId: string,
): Promise<CreateFaxSheetResult> {
  const [applicant, facility, diagnoses] = await Promise.all([
    prisma.applicant.findFirst({
      where: { id: applicantId, deletedAt: null },
      include: { qualifications: true },
    }),
    prisma.facility.findUnique({ where: { id: facilityId } }),
    prisma.diagnosis.findMany({ where: { applicantId } }),
  ]);
  if (!applicant) throw new Error(`Applicant not found: ${applicantId}`);
  if (!facility) throw new Error(`Facility not found: ${facilityId}`);

  const masked = maskApplicantForFax(applicant, { prefecture: facility.prefecture });
  const diagnosisForCategory =
    diagnoses.find((d) => d.category === facility.category) ?? null;

  const body = await buildFaxBody({
    applicant: masked,
    facility,
    diagnosisForCategory,
    desired: { startMonth: undefined, schedule: undefined },
    commuteArea: `${facility.prefecture}${facility.city} 近郊`,
    interviewSummary: null,
  });

  const pdfBuf = await renderFaxSheetPdf({
    facility: {
      name: facility.name,
      prefecture: facility.prefecture,
      city: facility.city,
      fax: facility.fax,
    },
    organization: ORG,
    applicant: masked,
    topDiagnosis: diagnosisForCategory
      ? {
          rank: diagnosisForCategory.rank,
          score: diagnosisForCategory.score,
          categoryLabel: CATEGORY_LABELS[facility.category] ?? facility.category,
        }
      : null,
    body,
    desired: {},
    commuteArea: `${facility.prefecture}${facility.city} 近郊`,
    generatedAt: new Date(),
  });

  // upsert: 同一 applicant × facility は 1 件に揃える。
  // FaxSheet には複合 unique がないため、自前で見つけてから upsert する。
  const existing = await prisma.faxSheet.findFirst({
    where: { applicantId, facilityId },
    select: { id: true, status: true },
  });

  const pdfKey = `fax-sheets/${applicantId}_${facilityId}.pdf`;
  await saveObject(pdfKey, pdfBuf);

  const faxSheet = existing
    ? await prisma.faxSheet.update({
        where: { id: existing.id },
        data: {
          pdfKey,
          // 既に SENT のものは再生成しても DRAFT に戻さない (誤送信防止)。
          status: existing.status === "SENT" ? "SENT" : "DRAFT",
          channel: "FAX",
        },
      })
    : await prisma.faxSheet.create({
        data: {
          applicantId,
          facilityId,
          pdfKey,
          channel: "FAX",
          status: "DRAFT",
        },
      });

  return { faxSheet, pdfKey, provider: body.provider };
}

/** 複数施設への一括生成。失敗した組合せはエラー配列で返し、成功分は確実に保存する。 */
export async function createFaxSheetsBatch(
  applicantId: string,
  facilityIds: string[],
): Promise<{ created: CreateFaxSheetResult[]; errors: CreateFaxSheetError[] }> {
  const created: CreateFaxSheetResult[] = [];
  const errors: CreateFaxSheetError[] = [];
  for (const facilityId of facilityIds) {
    try {
      created.push(await createFaxSheet(applicantId, facilityId));
    } catch (err) {
      errors.push({
        applicantId,
        facilityId,
        error: (err as Error).message,
      });
    }
  }
  return { created, errors };
}
