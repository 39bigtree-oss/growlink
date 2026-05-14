"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createRefundPolicy } from "@/lib/repositories/refund-policy";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { refundPolicySchema, type RefundTier } from "@/lib/schemas/contract";

export type RefundPolicyActionState = { ok: boolean; message?: string };

async function ensureWrite(): Promise<{ staffId: string; email: string | null } | RefundPolicyActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "contracts:write")) {
    return { ok: false, message: "返金規定の編集権限がありません" };
  }
  return { staffId: session.user.id, email: session.user.email ?? null };
}

function parseTiersFromString(raw: string): RefundTier[] {
  // 形式: "30:100, 60:50, 90:20" (withinDays:percent)
  return raw
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [days, percent] = s.split(":").map((p) => p.trim());
      const withinDays = Number(days);
      const percentNum = Number(percent);
      if (!Number.isFinite(withinDays) || !Number.isFinite(percentNum)) {
        throw new Error(`tier 形式不正: "${s}" (例: 30:100)`);
      }
      return { withinDays, refundRate: percentNum / 100 };
    })
    .sort((a, b) => a.withinDays - b.withinDays);
}

export async function createRefundPolicyAction(
  _prev: RefundPolicyActionState,
  formData: FormData,
): Promise<RefundPolicyActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;

  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "") || undefined;
  const tiersRaw = String(formData.get("tiers") ?? "");
  let tiers: RefundTier[];
  try {
    tiers = parseTiersFromString(tiersRaw);
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  const parsed = refundPolicySchema.safeParse({ name, description, tiers });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }

  const policy = await createRefundPolicy({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    tiers: parsed.data.tiers,
  });
  await Promise.all([
    recordAuditLog({ staffId: guard.staffId, action: "refund_policy.create", target: policy.id, payload: { name } }),
    recordAuditEvent(prisma, {
      actorStaffId: guard.staffId,
      actorEmail: guard.email,
      action: "refund_policy.create",
      entityType: "RefundPolicy",
      entityId: policy.id,
      after: { name, tiers },
    }),
  ]);
  revalidatePath("/admin/refund-policies");
  redirect(`/admin/refund-policies/${policy.id}`);
}
