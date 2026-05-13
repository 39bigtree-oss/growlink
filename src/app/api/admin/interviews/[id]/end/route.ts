import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { endInterview } from "@/lib/interview/service";
import { enqueueJob } from "@/lib/jobs/registry";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { drainAllQueues } from "@/lib/jobs/registry";

export const runtime = "nodejs";

/**
 * 面接終了: endedAt 設定 + 終了ジョブ (要約 + SkillSheet マージ + 通知) を enqueue。
 * 既存テストとの互換のため、memory provider なら drain で同期完了を保証する。
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "interviews:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await ctx.params;

  await endInterview(id);
  await enqueueJob("interview", "interview.finalize", { interviewId: id }, { target: id });

  // mock/memory provider なら enqueue 直後に走るので drain で待つ。
  if ((process.env.QUEUE_PROVIDER ?? "memory") === "memory") {
    await drainAllQueues();
  }

  await recordAuditLog({
    staffId: session.user.id,
    action: "interview.completed",
    target: id,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
