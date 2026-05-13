import { NextResponse } from "next/server";
import { ApplicantStatus } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { canTransition } from "@/lib/applicants/status-machine";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.nativeEnum(ApplicantStatus).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "applicants:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const applicant = await prisma.applicant.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!applicant) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (parsed.data.status && parsed.data.status !== applicant.status) {
    if (!canTransition(applicant.status, parsed.data.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_TRANSITION",
          from: applicant.status,
          to: parsed.data.status,
        },
        { status: 422 },
      );
    }
    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { status: parsed.data.status },
      }),
    ]);
    await recordAuditLog({
      staffId: session.user.id,
      action: "applicant.status_change",
      target: id,
      payload: { from: applicant.status, to: parsed.data.status },
    });
    return NextResponse.json(
      { ok: true, id, status: parsed.data.status },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, id, status: applicant.status }, { status: 200 });
}
