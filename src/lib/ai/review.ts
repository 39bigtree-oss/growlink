import "server-only";

import type { AiReview, AiReviewKind, AiReviewStatus, Prisma, PrismaClient } from "@prisma/client";

import { evaluateBias } from "@/lib/ai/bias-eval";
import { recordAuditEvent } from "@/lib/audit/event";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/repositories/audit-log";

/**
 * v1.9: AI 出力レビューワークフロー (Responsible AI)。
 *
 * フロー:
 *   1. AI が出力を生成 → createAiReview() で PENDING レコードを起こす (bias eval も自動実行)
 *   2. 人間レビューア (CONSULTANT 以上) が /admin/ai-reviews で確認
 *   3. APPROVED / EDITED / REJECTED のいずれかに遷移
 *   4. 公開系処理 (FAX 送信 / メール送信) は APPROVED か EDITED のみ進行
 *
 * これにより、AI 由来の差別表現・誤情報が一度も人間チェックなしに外部へ出ない設計を強制する。
 */

export type CreateAiReviewInput = {
  kind: AiReviewKind;
  applicantId?: string | null;
  refEntityType?: string | null;
  refEntityId?: string | null;
  aiOutput: string;
  confidence?: number | null;
};

export async function createAiReview(
  input: CreateAiReviewInput,
): Promise<AiReview> {
  const bias = await evaluateBias(input.aiOutput);
  const review = await prisma.aiReview.create({
    data: {
      kind: input.kind,
      applicantId: input.applicantId ?? null,
      refEntityType: input.refEntityType ?? null,
      refEntityId: input.refEntityId ?? null,
      aiOutput: input.aiOutput,
      confidence: input.confidence ?? null,
      biasEval: bias as unknown as Prisma.InputJsonValue,
      status: "PENDING",
    },
  });
  return review;
}

export type DecideAiReviewInput = {
  reviewId: string;
  staffId: string;
  staffEmail?: string | null;
  decision: "APPROVED" | "EDITED" | "REJECTED";
  finalOutput?: string;
  note?: string;
};

/**
 * レビュー結果を確定する。APPROVED / EDITED 時のみ公開可能。
 * 監査ログ (旧 + 新ハッシュチェーン) に二重記録。
 */
export async function decideAiReview(
  input: DecideAiReviewInput,
): Promise<AiReview> {
  const review = await prisma.$transaction(async (tx) => {
    const before = await tx.aiReview.findUnique({
      where: { id: input.reviewId },
      select: { status: true, aiOutput: true },
    });
    if (!before) throw new Error("AiReview not found");
    if (before.status !== "PENDING") {
      throw new Error(`既に決定済 (${before.status}) — 再決定は不可`);
    }
    const r = await tx.aiReview.update({
      where: { id: input.reviewId },
      data: {
        status: input.decision as AiReviewStatus,
        finalOutput:
          input.decision === "EDITED"
            ? input.finalOutput ?? null
            : input.decision === "APPROVED"
              ? before.aiOutput
              : null,
        reviewerStaffId: input.staffId,
        reviewedAt: new Date(),
        reviewNote: input.note ?? null,
      },
    });
    return r;
  });
  await Promise.all([
    recordAuditLog({
      staffId: input.staffId,
      action: `ai_review.${input.decision.toLowerCase()}`,
      target: review.id,
      payload: { kind: review.kind, applicantId: review.applicantId },
    }),
    recordAuditEvent(prisma, {
      actorStaffId: input.staffId,
      actorEmail: input.staffEmail ?? null,
      action: `ai_review.${input.decision.toLowerCase()}`,
      entityType: "AiReview",
      entityId: review.id,
      before: { status: "PENDING" },
      after: { status: input.decision, hasEdit: input.decision === "EDITED" },
    }),
  ]);
  return review;
}

export function findAiReview(id: string) {
  return prisma.aiReview.findUnique({
    where: { id },
    include: {
      applicant: { select: { id: true, lastName: true, firstName: true } },
      reviewerStaff: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export type ListAiReviewsInput = {
  status?: AiReviewStatus;
  kind?: AiReviewKind;
  applicantId?: string;
  take?: number;
  skip?: number;
};

export function listAiReviews(input: ListAiReviewsInput = {}) {
  const { status, kind, applicantId, take = 100, skip = 0 } = input;
  return prisma.aiReview.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
      ...(applicantId ? { applicantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: { select: { id: true, lastName: true, firstName: true } },
      reviewerStaff: { select: { id: true, name: true, role: true } },
    },
    take,
    skip,
  });
}

export function countAiReviews(input: ListAiReviewsInput = {}) {
  const { status, kind, applicantId } = input;
  return prisma.aiReview.count({
    where: {
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
      ...(applicantId ? { applicantId } : {}),
    },
  });
}

/**
 * 「この AiReview は公開可能か?」の判定。
 * - APPROVED か EDITED → 公開可
 * - PENDING → 不可 (まだ承認されていない)
 * - REJECTED → 不可
 */
export function isPublishable(status: AiReviewStatus): boolean {
  return status === "APPROVED" || status === "EDITED";
}

/**
 * 公開すべき最終テキストを返す。APPROVED → aiOutput、EDITED → finalOutput。
 * 公開不可な場合は null。
 */
export function getPublishableOutput(review: Pick<AiReview, "status" | "aiOutput" | "finalOutput">): string | null {
  if (review.status === "APPROVED") return review.aiOutput;
  if (review.status === "EDITED") return review.finalOutput ?? review.aiOutput;
  return null;
}

// Prisma 未使用警告回避用
export type { PrismaClient };
