import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ヘルスチェック。
 * - server: ts レスポンスを返せること = Node ランタイム生存確認
 * - db    : `SELECT 1` で Postgres 到達確認
 * - storage: STORAGE_DIR が読み書きできる前提 (簡易確認)
 *
 * 不健全な要素があれば全体を 503 で返す。Railway や ALB のヘルスチェックに使う。
 */
export async function GET() {
  const checks: Record<string, "ok" | string> = {
    server: "ok",
    db: "ok",
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    checks.db = (err as Error).message;
  }
  const allOk = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json(
    { ok: allOk, checks, ts: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
