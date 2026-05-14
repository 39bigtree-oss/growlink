import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { calcAntiteishokuDate, daysUntilAntiteishoku } from "@/lib/compliance/anti-teishoku";
import { prisma } from "@/lib/db";
import { renderDispatchLedgerPdf } from "@/lib/pdf/dispatchLedgerPdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasCapability(session.user.role, "dispatch-ledger:read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { id } = await ctx.params;
  const ledger = await prisma.dispatchLedger.findUnique({
    where: { id },
    include: {
      applicant: { select: { lastName: true, firstName: true } },
      facility: { select: { name: true } },
      jobOrder: { select: { title: true } },
    },
  });
  if (!ledger) return new NextResponse("Not Found", { status: 404 });

  const antiteishoku = calcAntiteishokuDate(ledger.dispatchPeriodStart);
  const buffer = await renderDispatchLedgerPdf({
    ledgerId: ledger.id,
    applicantFullName: `${ledger.applicant.lastName} ${ledger.applicant.firstName}`,
    facilityName: ledger.facility.name,
    jobOrderTitle: ledger.jobOrder.title,
    dispatchPeriodStart: ledger.dispatchPeriodStart,
    dispatchPeriodEnd: ledger.dispatchPeriodEnd,
    antiteishokuDate: antiteishoku,
    dispatchManagerName: ledger.dispatchManagerName,
    receivingManagerName: ledger.receivingManagerName,
    socialInsuranceEnrolled: ledger.socialInsuranceEnrolled,
    contractCount: ledger.contractCount,
    notes: ledger.notes,
    daysUntilAntiteishoku: daysUntilAntiteishoku(antiteishoku),
  });

  // 派遣台帳の出力は監査対象 (誰がいつ何の理由で出したか追跡)
  await recordAuditEvent(prisma, {
    actorStaffId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "dispatch_ledger.pdf_exported",
    entityType: "DispatchLedger",
    entityId: ledger.id,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dispatch-ledger-${ledger.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
