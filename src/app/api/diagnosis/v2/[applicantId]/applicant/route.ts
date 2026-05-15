import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildDiagnosisV2ForApplicant } from "@/lib/ai/diagnosis-v2/build";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { renderApplicantDiagnosisPdf } from "@/lib/pdf/v2/applicantPdf";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * v2.0 求職者向け AI キャリア診断 PDF。
 * A4 1 枚に、4 軸プロファイル + 4 大エンジン + 強み TOP3 + 業態適性 + 隠れた適性 +
 * 相性の良い同僚タイプ + 総評 が収まる。
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
    select: { lastName: true, firstName: true },
  });
  if (!applicant) return new NextResponse("Not Found", { status: 404 });

  const diagnosis = await buildDiagnosisV2ForApplicant(applicantId);
  if (!diagnosis) return new NextResponse("Diagnosis unavailable", { status: 422 });

  const buffer = await renderApplicantDiagnosisPdf({
    applicantFullName: `${applicant.lastName} ${applicant.firstName}`,
    generatedAt: new Date(),
    diagnosis,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="career-diagnosis-${applicantId}-applicant.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
