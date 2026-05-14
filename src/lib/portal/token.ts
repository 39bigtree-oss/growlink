import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";

/**
 * 施設ポータル用の HMAC 署名トークン。
 *
 * 形式: `<random16hex>.<facilityId>.<expiresAt(unix sec)>.<hmac(sha256 first 32 hex)>`
 *
 *   - 平文部分 (random + facilityId + expiresAt) は誰でもパースできる
 *   - 末尾 hmac は AUTH_SECRET ベースで検証 → 改ざん不可
 *   - DB にもレコード (FacilityPortalToken) を持ち、revoke / アクセスカウントを管理
 *
 * URL: `/portal/<token>` に貼って施設に共有する。
 * 施設はログイン不要で自分宛 FAX / 求人案件 / 請求書を見られる。
 */

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s === "change-me-to-a-random-string") {
    throw new Error("AUTH_SECRET が未設定 or デフォルト値のままです。");
  }
  return s;
}

export type PortalTokenPayload = {
  facilityId: string;
  expiresAt: Date;
};

export function signPortalToken(payload: PortalTokenPayload): string {
  const nonce = randomBytes(8).toString("hex");
  const expSec = Math.floor(payload.expiresAt.getTime() / 1000);
  const base = `${nonce}.${payload.facilityId}.${expSec}`;
  const sig = createHmac("sha256", getSecret()).update(base).digest("hex").slice(0, 32);
  return `${base}.${sig}`;
}

export type VerifiedPortalToken =
  | { ok: true; facilityId: string; expiresAt: Date; nonce: string }
  | { ok: false; reason: "invalid_format" | "bad_signature" | "expired" };

/**
 * pure 検証 (DB 参照無し)。署名と有効期限だけチェックする。
 * DB の revoke 状態は別途確認すること。
 */
export function verifyPortalTokenSignature(raw: string, now: Date = new Date()): VerifiedPortalToken {
  const parts = raw.split(".");
  if (parts.length !== 4) return { ok: false, reason: "invalid_format" };
  const [nonce, facilityId, expSecStr, sig] = parts;
  const expSec = Number(expSecStr);
  if (!Number.isFinite(expSec)) return { ok: false, reason: "invalid_format" };

  const base = `${nonce}.${facilityId}.${expSecStr}`;
  const expected = createHmac("sha256", getSecret()).update(base).digest("hex").slice(0, 32);
  // タイミング攻撃対策に長さを揃えて比較
  if (sig.length !== expected.length) return { ok: false, reason: "bad_signature" };
  const ok = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  if (!ok) return { ok: false, reason: "bad_signature" };

  const expiresAt = new Date(expSec * 1000);
  if (expiresAt.getTime() < now.getTime()) return { ok: false, reason: "expired" };

  return { ok: true, facilityId, expiresAt, nonce };
}

/**
 * DB 参照含めて検証。revoke 済みなら null を返す。アクセスカウンタを 1 増やす。
 */
export async function verifyPortalTokenWithDb(raw: string): Promise<
  | {
      ok: true;
      facilityId: string;
      facility: { id: string; name: string; prefecture: string; city: string };
      tokenId: string;
    }
  | { ok: false; reason: string }
> {
  const sigCheck = verifyPortalTokenSignature(raw);
  if (!sigCheck.ok) return { ok: false, reason: sigCheck.reason };

  const record = await prisma.facilityPortalToken.findUnique({
    where: { token: raw },
    include: {
      facility: { select: { id: true, name: true, prefecture: true, city: true } },
    },
  });
  if (!record) return { ok: false, reason: "not_found" };
  if (record.revokedAt) return { ok: false, reason: "revoked" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired_db" };

  await prisma.facilityPortalToken.update({
    where: { id: record.id },
    data: {
      accessCount: { increment: 1 },
      lastSeenAt: new Date(),
    },
  });

  return {
    ok: true,
    facilityId: record.facilityId,
    facility: record.facility,
    tokenId: record.id,
  };
}

/**
 * 施設向けに新規トークンを発行 (default 90 日有効)。
 */
export async function issuePortalToken(args: {
  facilityId: string;
  expiresInDays?: number;
  label?: string;
  createdByStaffId?: string;
}): Promise<{ token: string; url: string; recordId: string }> {
  const expiresInDays = args.expiresInDays ?? 90;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = signPortalToken({ facilityId: args.facilityId, expiresAt });
  const record = await prisma.facilityPortalToken.create({
    data: {
      facilityId: args.facilityId,
      token,
      expiresAt,
      label: args.label ?? null,
      createdBy: args.createdByStaffId ?? null,
    },
  });
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_BASE_URL ?? "";
  const url = `${base.replace(/\/$/, "")}/portal/${token}`;
  return { token, url, recordId: record.id };
}

export async function revokePortalToken(tokenId: string): Promise<void> {
  await prisma.facilityPortalToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}
