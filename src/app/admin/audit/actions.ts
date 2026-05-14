"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { captureAuditCheckpoint } from "@/lib/audit/checkpoint";
import { verifyChain } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { listAuditEventsForVerification } from "@/lib/repositories/audit-event";

export type VerifyResult = {
  ok: boolean;
  message: string;
  total: number;
  brokenAt?: number;
};

export type CheckpointResult = {
  ok: boolean;
  message: string;
  scanned: number;
};

export async function verifyAuditChainAction(): Promise<VerifyResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "ログインが必要です", total: 0 };
  }
  if (!hasCapability(session.user.role, "audit:read")) {
    return { ok: false, message: "監査ログ閲覧権限がありません", total: 0 };
  }
  const events = await listAuditEventsForVerification();
  const result = verifyChain(events);
  if (result.valid) {
    return {
      ok: true,
      message: `チェーン整合性 OK (${events.length} 件)`,
      total: events.length,
    };
  }
  return {
    ok: false,
    message: `チェーンが ${result.brokenAt} 件目で破綻しています`,
    total: events.length,
    brokenAt: result.brokenAt,
  };
}

export async function captureCheckpointAction(): Promise<CheckpointResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です", scanned: 0 };
  if (!hasCapability(session.user.role, "audit:read")) {
    return { ok: false, message: "監査ログの権限がありません", scanned: 0 };
  }
  const r = await captureAuditCheckpoint(
    `manual capture by ${session.user.email ?? session.user.id}`,
  );
  revalidatePath("/admin/audit");
  return { ok: r.ok, message: r.message, scanned: r.scannedEvents };
}
