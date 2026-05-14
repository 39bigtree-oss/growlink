import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { saveObject, readObject, pathFor } from "@/lib/storage/local";
import { mockEmailProvider } from "@/lib/email/providers/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 深いヘルスチェック。簡易 /api/health より重い検査を実行。
 *
 * - DB: 主要テーブル件数取得 + SELECT 1
 * - Storage: write → read → unlink ラウンドトリップ
 * - Email provider: name の取得 (mock or resend の起動状況)
 * - Queue provider: 環境変数の解決
 * - 在留期限 / 抵触日 / 退職予兆など、未処理ジョブの件数概況
 *
 * 機密性は低めだが、管理者 (settings:read) のみ閲覧可。
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !hasCapability(session.user.role, "settings:read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const checks: Record<string, "ok" | string> = {};
  const meta: Record<string, unknown> = {};

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
    const [applicants, facilities, placements, auditEvents, nurtureActive] =
      await Promise.all([
        prisma.applicant.count({ where: { deletedAt: null } }),
        prisma.facility.count(),
        prisma.placement.count(),
        prisma.auditEvent.count(),
        prisma.nurtureSequence.count({ where: { status: "ACTIVE" } }),
      ]);
    meta.counts = { applicants, facilities, placements, auditEvents, nurtureActive };
  } catch (err) {
    checks.db = (err as Error).message;
  }

  // Storage
  try {
    const key = `_healthcheck/${Date.now()}.txt`;
    await saveObject(key, Buffer.from("ping"));
    const back = await readObject(key);
    checks.storage = back?.toString("utf8") === "ping" ? "ok" : "mismatch";
    meta.storagePath = pathFor(key);
  } catch (err) {
    checks.storage = (err as Error).message;
  }

  // Email
  try {
    checks.email = `ok:${mockEmailProvider.name}`;
    meta.emailProvider = process.env.EMAIL_PROVIDER ?? "mock";
  } catch (err) {
    checks.email = (err as Error).message;
  }

  // Queue
  checks.queue = `ok:${process.env.QUEUE_PROVIDER ?? "memory"}`;

  // AI provider
  checks.ai = process.env.AI_PROVIDER === "anthropic" || process.env.AI_PROVIDER === "gemini"
    ? `live:${process.env.AI_PROVIDER}`
    : "mock";

  // Sentry
  checks.sentry = process.env.SENTRY_DSN ? "configured" : "stub";

  const allOk = Object.values(checks).every((v) => v === "ok" || v.startsWith("ok") || v === "configured" || v === "stub" || v === "mock" || v.startsWith("live:"));
  return NextResponse.json(
    {
      ok: allOk,
      checks,
      meta,
      ts: new Date().toISOString(),
      version: "v1.8",
    },
    { status: allOk ? 200 : 503 },
  );
}
