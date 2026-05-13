import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { isVisaType } from "@/lib/constants/visa-types";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export const runtime = "nodejs";

/**
 * 在留資格の更新 (PUT) と削除 (DELETE)。
 * 権限は applicants:write を流用 (Phase 5 のロール拡張で別カテゴリにしてもよい)。
 */
const bodySchema = z.object({
  visaType: z.string().refine(isVisaType, "unknown visaType"),
  visaNumber: z.string().max(40).optional().nullable(),
  expireAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const applicant = await prisma.applicant.findFirst({ where: { id, deletedAt: null } });
  if (!applicant) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const data = {
    visaType: parsed.data.visaType,
    visaNumber: parsed.data.visaNumber ?? null,
    expireAt: parsed.data.expireAt ? new Date(parsed.data.expireAt) : null,
    notes: parsed.data.notes ?? null,
  };
  const updated = await prisma.residenceStatus.upsert({
    where: { applicantId: id },
    create: { applicantId: id, ...data },
    update: data,
  });

  await recordAuditLog({
    staffId: session.user.id,
    action: "residence_status.updated",
    target: id,
    payload: { visaType: data.visaType },
  });

  return NextResponse.json({ ok: true, residenceStatus: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCapability(session.user.role, "applicants:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await prisma.residenceStatus.deleteMany({ where: { applicantId: id } });
  await recordAuditLog({
    staffId: session.user.id,
    action: "residence_status.deleted",
    target: id,
  });
  return NextResponse.json({ ok: true });
}
