import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildDiagnosis } from "@/lib/ai/diagnosis/buildDiagnosis";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  applicantId: z.string().min(1),
  /** 既存診断がある場合に再実行を強制する */
  regenerate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { applicantId, regenerate = false } = parsed.data;

  const existing = await prisma.diagnosis.findFirst({ where: { applicantId } });
  if (existing && !regenerate) {
    return NextResponse.json(
      {
        ok: false,
        error: "ALREADY_DIAGNOSED",
        pdfUrl: `/api/diagnosis/${applicantId}/pdf`,
      },
      { status: 409 },
    );
  }

  try {
    const result = await buildDiagnosis(applicantId);
    await recordAuditLog({
      staffId: session.user.id,
      action: "diagnosis.run",
      target: applicantId,
      payload: { provider: result.provider, regenerated: Boolean(existing) },
    });
    return NextResponse.json(
      {
        ok: true,
        applicantId: result.applicantId,
        provider: result.provider,
        pdfUrl: `/api/diagnosis/${result.applicantId}/pdf`,
        results: result.rows.map((r) => ({
          category: r.category,
          score: r.score,
          rank: r.rank,
          proComment: r.proComment,
          conComment: r.conComment,
        })),
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("Applicant not found")) {
      return NextResponse.json({ ok: false, error: "APPLICANT_NOT_FOUND" }, { status: 404 });
    }
    console.error("[api/diagnosis] failed", { applicantId, err: message });
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
