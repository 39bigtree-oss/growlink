import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  buildDiagnosisPdfInput,
  buildOverviewText,
} from "@/lib/pdf/diagnosisPdf.helpers";
import { renderDiagnosisPdf } from "@/lib/pdf/diagnosisPdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ applicantId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { applicantId } = await ctx.params;

  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    select: { id: true, lastName: true, firstName: true },
  });
  if (!applicant) {
    return NextResponse.json({ ok: false, error: "APPLICANT_NOT_FOUND" }, { status: 404 });
  }

  const diagnoses = await prisma.diagnosis.findMany({
    where: { applicantId },
  });
  if (diagnoses.length === 0) {
    return NextResponse.json(
      { ok: false, error: "NO_DIAGNOSIS_YET" },
      { status: 404 },
    );
  }

  const overview = buildOverviewText(diagnoses);
  const input = buildDiagnosisPdfInput(applicant, diagnoses, overview);
  const buffer = await renderDiagnosisPdf(input);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="diagnosis-${applicantId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
