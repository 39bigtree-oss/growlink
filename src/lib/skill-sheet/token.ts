import "server-only";

import { randomBytes } from "node:crypto";

import type { SkillSheetToken } from "@prisma/client";

import { prisma } from "@/lib/db";

const TOKEN_TTL_DAYS = 14;

/**
 * 求職者用のスキルシート編集トークンを発行する。
 * 既存の有効トークンがあれば再利用 (期限が 24h 未満なら新規発行で延長)。
 */
export async function ensureSkillSheetToken(applicantId: string): Promise<SkillSheetToken> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.skillSheetToken.findFirst({
    where: {
      applicantId,
      revokedAt: null,
      expiresAt: { gt: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.skillSheetToken.create({
    data: {
      applicantId,
      token: randomBytes(24).toString("base64url"),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * トークンを検証して applicant を返す。失効・revoke 済みは null。
 * 同時に lastSeenAt を更新する。
 */
export async function consumeSkillSheetToken(token: string): Promise<{
  token: SkillSheetToken;
  status: "ok" | "expired" | "revoked";
} | null> {
  const row = await prisma.skillSheetToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.revokedAt) return { token: row, status: "revoked" };
  if (row.expiresAt.getTime() < Date.now()) return { token: row, status: "expired" };
  const updated = await prisma.skillSheetToken.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date() },
  });
  return { token: updated, status: "ok" };
}

export function buildSkillSheetUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/skill-sheet/${encodeURIComponent(token)}`;
}

export function resolveAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_BASE_URL ??
    "http://localhost:3000"
  );
}
