import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { GENESIS_PREV_HASH, verifyChain } from "@/lib/audit/event";

/**
 * verifyChain は pure な検証関数。DB を介さず in-memory のチェーンで検証する。
 *
 * テスト用に AuditEvent と同じ shape のレコードを手で組み立て、hash を実装と
 * 同じロジック (キーソート + sha256) で計算する。
 */

type ChainRecord = {
  actorStaffId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Prisma.JsonValue;
  after: Prisma.JsonValue;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  prevHash: string;
  hash: string;
};

function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
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

function build(prev: string, partial: Omit<ChainRecord, "prevHash" | "hash">): ChainRecord {
  const canonical = canonicalize({
    prevHash: prev,
    actorStaffId: partial.actorStaffId,
    actorEmail: partial.actorEmail,
    action: partial.action,
    entityType: partial.entityType,
    entityId: partial.entityId,
    before: partial.before ?? null,
    after: partial.after ?? null,
    ipAddress: partial.ipAddress,
    userAgent: partial.userAgent,
    requestId: partial.requestId,
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return { ...partial, prevHash: prev, hash };
}

describe("verifyChain", () => {
  it("空のチェーンは valid", () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });

  it("Genesis から伸びた正常チェーンは valid", () => {
    const e1 = build(GENESIS_PREV_HASH, {
      actorStaffId: "s1",
      actorEmail: "a@x",
      action: "applicant.created",
      entityType: "Applicant",
      entityId: "ap1",
      before: null,
      after: { name: "Yamada" },
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const e2 = build(e1.hash, {
      actorStaffId: "s1",
      actorEmail: "a@x",
      action: "applicant.updated",
      entityType: "Applicant",
      entityId: "ap1",
      before: { name: "Yamada" },
      after: { name: "Yamada Hanako" },
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    expect(verifyChain([e1, e2])).toEqual({ valid: true });
  });

  it("途中レコードの after を改ざんすると brokenAt=1", () => {
    const e1 = build(GENESIS_PREV_HASH, {
      actorStaffId: null,
      actorEmail: null,
      action: "applicant.created",
      entityType: "Applicant",
      entityId: "ap1",
      before: null,
      after: { name: "Yamada" },
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const e2 = build(e1.hash, {
      actorStaffId: null,
      actorEmail: null,
      action: "applicant.updated",
      entityType: "Applicant",
      entityId: "ap1",
      before: null,
      after: { name: "Original" },
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const tampered = { ...e2, after: { name: "Tampered" } };
    const r = verifyChain([e1, tampered]);
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(1);
  });

  it("最初のレコードの prevHash が Genesis でなければ brokenAt=0", () => {
    const e1 = build("0".repeat(63) + "1", {
      actorStaffId: null,
      actorEmail: null,
      action: "x",
      entityType: "X",
      entityId: null,
      before: null,
      after: null,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const r = verifyChain([e1]);
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(0);
  });

  it("中間のレコードを削除すると brokenAt=1 (prev リンク切れ)", () => {
    const e1 = build(GENESIS_PREV_HASH, {
      actorStaffId: null,
      actorEmail: null,
      action: "a1",
      entityType: "X",
      entityId: null,
      before: null,
      after: null,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const e2 = build(e1.hash, {
      actorStaffId: null,
      actorEmail: null,
      action: "a2",
      entityType: "X",
      entityId: null,
      before: null,
      after: null,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    const e3 = build(e2.hash, {
      actorStaffId: null,
      actorEmail: null,
      action: "a3",
      entityType: "X",
      entityId: null,
      before: null,
      after: null,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
    // 中間 e2 を削除
    const r = verifyChain([e1, e3]);
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(1);
  });
});
