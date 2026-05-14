"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { markInvoicePaid } from "@/lib/repositories/invoice";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export type InvoiceActionState = { ok: boolean; message?: string };

export async function markInvoicePaidAction(id: string): Promise<InvoiceActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "invoices:write")) {
    return { ok: false, message: "請求書の更新権限がありません" };
  }
  const before = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true, paidAt: true },
  });
  const updated = await markInvoicePaid(id, new Date());
  await Promise.all([
    recordAuditLog({
      staffId: session.user.id,
      action: "invoice.mark_paid",
      target: id,
      payload: { invoiceNumber: updated.invoiceNumber, paidAt: updated.paidAt },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: "invoice.mark_paid",
      entityType: "Invoice",
      entityId: id,
      before,
      after: { status: "PAID", paidAt: updated.paidAt },
    }),
  ]);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  return { ok: true, message: `${updated.invoiceNumber} を入金済にしました` };
}
