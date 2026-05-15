import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildDiagnosisV2ForApplicant } from "@/lib/ai/diagnosis-v2/build";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { renderFacilityDiagnosisPdf } from "@/lib/pdf/v2/facilityPdf";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * v2.0 施設・紹介先向け候補者適性レポート PDF。
 * 求職者向けと違って、業務適性と留意点を客観データで提示する。
 * PII 最小化のため氏名はイニシャル表記。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ applicantId: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasCapability(session.user.role, "applicants:read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { applicantId } = await ctx.params;
  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    select: {
      lastName: true,
      firstName: true,
      qualifications: { select: { name: true } },
      skillSheet: { select: { careers: true } },
    },
  });
  if (!applicant) return new NextResponse("Not Found", { status: 404 });

  const diagnosis = await buildDiagnosisV2ForApplicant(applicantId);
  if (!diagnosis) return new NextResponse("Diagnosis unavailable", { status: 422 });

  const initials = `${applicant.lastName.slice(0, 1)}.${applicant.firstName.slice(0, 1)}.`;
  const careersCount = Array.isArray(applicant.skillSheet?.careers)
    ? (applicant.skillSheet?.careers as unknown[]).length
    : 0;
  const experienceYears = Math.min(careersCount * 3, 20);

  const buffer = await renderFacilityDiagnosisPdf({
    applicantInitials: initials,
    qualifications: applicant.qualifications.map((q) => q.name),
    experienceYears,
    generatedAt: new Date(),
    diagnosis,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="career-diagnosis-${applicantId}-facility.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
