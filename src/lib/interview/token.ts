import "server-only";

import { randomBytes } from "node:crypto";

import type { InterviewToken } from "@prisma/client";

import { prisma } from "@/lib/db";

const TOKEN_TTL_DAYS = 14;

export async function ensureInterviewToken(interviewId: string): Promise<InterviewToken> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.interviewToken.findFirst({
    where: { interviewId, revokedAt: null, expiresAt: { gt: cutoff } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.interviewToken.create({
    data: {
      interviewId,
      token: randomBytes(24).toString("base64url"),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

export async function consumeInterviewToken(token: string): Promise<{
  token: InterviewToken;
  status: "ok" | "expired" | "revoked";
} | null> {
  const row = await prisma.interviewToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.revokedAt) return { token: row, status: "revoked" };
  if (row.expiresAt.getTime() < Date.now()) return { token: row, status: "expired" };
  const updated = await prisma.interviewToken.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date() },
  });
  return { token: updated, status: "ok" };
}

export function buildInterviewUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/interview/${encodeURIComponent(token)}`;
}
