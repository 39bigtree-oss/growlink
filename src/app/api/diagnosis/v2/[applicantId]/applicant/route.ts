import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildDiagnosisV2ForApplicant } from "@/lib/ai/diagnosis-v2/build";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { renderApplicantDiagnosisPdf } from "@/lib/pdf/v2/applicantPdf";
import { getCachedOrRender, makeCacheKey } from "@/lib/pdf/v2/cache";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * v2.0 求職者向け AI キャリア診断 PDF。
 *
 * 初回は React-PDF レンダリングで 30〜90 秒かかる場合があるが、
 * .storage/diagnosis-v2/ にキャッシュされるので 2 回目以降は即時応答。
 * applicant.updatedAt がキャッシュキーに含まれるので、データ更新時は自動で無効化される。
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
    select: { lastName: true, firstName: true, updatedAt: true },
  });
  if (!applicant) return new NextResponse("Not Found", { status: 404 });

  const key = makeCacheKey(applicantId, "applicant", applicant.updatedAt);
  try {
    const buffer = await getCachedOrRender(key, async () => {
      const diagnosis = await buildDiagnosisV2ForApplicant(applicantId);
      if (!diagnosis) throw new Error("Diagnosis unavailable");
      return renderApplicantDiagnosisPdf({
        applicantFullName: `${applicant.lastName} ${applicant.firstName}`,
        generatedAt: new Date(),
        diagnosis,
      });
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="career-diagnosis-${applicantId}-applicant.pdf"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    return new NextResponse(`PDF render failed: ${(err as Error).message}`, { status: 500 });
  }
}
