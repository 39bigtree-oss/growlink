import "server-only";

import { createHash } from "node:crypto";

import { Prisma, type AuditEvent, type PrismaClient } from "@prisma/client";

/**
 * AuditEvent: append-only ハッシュチェーン監査ログ。
 *
 *   hash = sha256(prevHash || canonical(this))
 *
 * canonical は JSON.stringify を「キーをソートして」「createdAt/hash 自身は除外して」
 * 安定的に再構築。検証時は連続レコードを取り出してチェーンの完全性を再計算する。
 *
 * Genesis レコード (最初) の prevHash は "0" × 64。
 */

export const GENESIS_PREV_HASH = "0".repeat(64);

export type AuditEventInput = {
  actorStaffId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

/**
 * AuditEvent を 1 件書き込む。トランザクション内で必ず直前レコードを取得し
 * ハッシュチェーンを伸ばす。並行書き込みでも整合性が保たれるよう Serializable で。
 */
export async function recordAuditEvent(
  prisma: PrismaClient,
  input: AuditEventInput,
): Promise<AuditEvent> {
  return prisma.$transaction(
    async (tx) => {
      const prev = await tx.auditEvent.findFirst({
        orderBy: { createdAt: "desc" },
        select: { hash: true },
      });
      const prevHash = prev?.hash ?? GENESIS_PREV_HASH;
      const canonical = canonicalize({
        prevHash,
        actorStaffId: input.actorStaffId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
      });
      const hash = createHash("sha256").update(canonical).digest("hex");

      return tx.auditEvent.create({
        data: {
          actorStaffId: input.actorStaffId ?? null,
          actorEmail: input.actorEmail ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          before: input.before ?? Prisma.JsonNull,
          after: input.after ?? Prisma.JsonNull,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          requestId: input.requestId ?? null,
          prevHash,
          hash,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * チェーン整合性検証。events は createdAt ASC で並んでいる前提。
 * 改ざんされていなければ valid:true。途中で破綻していれば brokenAt にインデックスを返す。
 */
export function verifyChain(
  events: Array<
    Pick<
      AuditEvent,
      | "actorStaffId"
      | "actorEmail"
      | "action"
      | "entityType"
      | "entityId"
      | "before"
      | "after"
      | "ipAddress"
      | "userAgent"
      | "requestId"
      | "prevHash"
      | "hash"
    >
  >,
): { valid: boolean; brokenAt?: number } {
  let expectedPrev = GENESIS_PREV_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prevHash !== expectedPrev) {
      return { valid: false, brokenAt: i };
    }
    const canonical = canonicalize({
      prevHash: e.prevHash,
      actorStaffId: e.actorStaffId,
      actorEmail: e.actorEmail,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      before: e.before as Prisma.InputJsonValue | null,
      after: e.after as Prisma.InputJsonValue | null,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      requestId: e.requestId,
    });
    const calc = createHash("sha256").update(canonical).digest("hex");
    if (calc !== e.hash) {
      return { valid: false, brokenAt: i };
    }
    expectedPrev = e.hash;
  }
  return { valid: true };
}

/**
 * JSON のキーをソートして安定文字列化。値が undefined のキーは省略。
 * Prisma の JsonNull / DbNull はリテラル "null" として扱う。
 */
function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v === undefined) return null;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}
