"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { runNurtureScan } from "@/lib/nurture/runner";

export type RunScanState = { ok: boolean; message?: string };

export async function runNurtureScanAction(): Promise<RunScanState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "applicants:write")) {
    return { ok: false, message: "実行権限がありません" };
  }
  const result = await runNurtureScan();
  revalidatePath("/admin/nurture");
  return {
    ok: true,
    message: `scan: ${result.scanned} 件処理 (mail ${result.emailSent} / todo ${result.staffTodoCreated} / wait ${result.waited} / done ${result.completed})`,
  };
}
