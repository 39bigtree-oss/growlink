import "server-only";

import { prisma } from "@/lib/db";
import { computeBaseDiagnosis, type DiagnosisV2Result } from "./scorer";

/**
 * 申込者情報を DB から取得し、v2 診断を生成する。
 *
 * 現状はベース計算 (決定論的) のみ。Gemini 接続後は AI に同 schema を埋めさせる
 * (`enrichWithGemini` を将来追加予定)。
 */
export async function buildDiagnosisV2ForApplicant(applicantId: string): Promise<DiagnosisV2Result | null> {
  const a = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    include: {
      qualifications: { select: { name: true } },
      skillSheet: { select: { careers: true } },
    },
  });
  if (!a) return null;

  const careersCount = Array.isArray(a.skillSheet?.careers)
    ? (a.skillSheet?.careers as unknown[]).length
    : 0;
  const experienceYears = Math.min(careersCount * 3, 20);

  return computeBaseDiagnosis({
    applicantId: a.id,
    qualifications: a.qualifications.map((q) => q.name),
    desiredCategories: a.desiredCategories,
    experienceYears,
  });
}
