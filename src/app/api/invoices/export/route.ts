import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * 全請求書を CSV でエクスポートする。会計連携 (freee / Money Forward) へ
 * インポートする想定の最小フォーマット。実 API 連携は v1.7。
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasCapability(session.user.role, "invoices:read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const rows = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
    include: { facility: { select: { name: true } } },
  });
  const header = "invoice_number,facility,issued_at,due_at,paid_at,amount,tax,total,status";
  const body = rows
    .map((r) =>
      [
        r.invoiceNumber,
        `"${r.facility.name.replace(/"/g, '""')}"`,
        r.issuedAt.toISOString().slice(0, 10),
        r.dueAt.toISOString().slice(0, 10),
        r.paidAt ? r.paidAt.toISOString().slice(0, 10) : "",
        Number(r.amount),
        Number(r.tax),
        Number(r.totalAmount),
        r.status,
      ].join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}\n`;

  await recordAuditEvent(prisma, {
    actorStaffId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "invoice.csv_exported",
    entityType: "Invoice",
    entityId: null,
    after: { rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
