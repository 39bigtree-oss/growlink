"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createContract, updateContract } from "@/lib/repositories/contract";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { contractFormSchema } from "@/lib/schemas/contract";

export type ContractActionState = { ok: boolean; message?: string };

async function ensureWrite(): Promise<{ staffId: string; email: string | null } | ContractActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "contracts:write")) {
    return { ok: false, message: "契約の編集権限がありません" };
  }
  return { staffId: session.user.id, email: session.user.email ?? null };
}

function readFormData(formData: FormData) {
  return {
    facilityId: String(formData.get("facilityId") ?? ""),
    contractType: String(formData.get("contractType") ?? "INTRODUCTION_FEE"),
    feeRate: Number(formData.get("feeRate") ?? 0),
    refundPolicyId: String(formData.get("refundPolicyId") ?? "") || undefined,
    paymentTermDays: Number(formData.get("paymentTermDays") ?? 60),
    startDate: String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10)),
    endDate: formData.get("endDate") ? String(formData.get("endDate")) : undefined,
    signedBy: String(formData.get("signedBy") ?? "") || undefined,
    eSignProvider: String(formData.get("eSignProvider") ?? "MOCK"),
    status: String(formData.get("status") ?? "DRAFT"),
  };
}

export async function createContractAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const parsed = contractFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }
  const c = await createContract({
    facilityId: parsed.data.facilityId,
    contractType: parsed.data.contractType,
    feeRate: new Prisma.Decimal(parsed.data.feeRate),
    refundPolicyId: parsed.data.refundPolicyId ?? null,
    paymentTermDays: parsed.data.paymentTermDays,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate ?? null,
    signedBy: parsed.data.signedBy ?? null,
    eSignProvider: parsed.data.eSignProvider,
    status: parsed.data.status,
  });
  await Promise.all([
    recordAuditLog({
      staffId: guard.staffId,
      action: "contract.create",
      target: c.id,
      payload: { contractType: c.contractType, facilityId: c.facilityId },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: guard.staffId,
      actorEmail: guard.email,
      action: "contract.create",
      entityType: "Contract",
      entityId: c.id,
      after: { contractType: c.contractType, facilityId: c.facilityId, feeRate: c.feeRate.toString() },
    }),
  ]);
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${c.id}`);
}

export async function updateContractStatusAction(id: string, status: string): Promise<ContractActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const before = await prisma.contract.findUnique({ where: { id }, select: { status: true } });
  await updateContract(id, {
    status: status as "DRAFT" | "SENT" | "SIGNED" | "EXPIRED" | "CANCELLED",
    ...(status === "SIGNED" ? { signedAt: new Date() } : {}),
  });
  await Promise.all([
    recordAuditLog({ staffId: guard.staffId, action: "contract.status", target: id, payload: { status } }),
    recordAuditEvent(prisma, {
      actorStaffId: guard.staffId,
      actorEmail: guard.email,
      action: "contract.status",
      entityType: "Contract",
      entityId: id,
      before,
      after: { status },
    }),
  ]);
  revalidatePath(`/admin/contracts/${id}`);
  return { ok: true, message: `ステータスを ${status} に更新しました` };
}
