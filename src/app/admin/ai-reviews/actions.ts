"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { decideAiReview, createAiReview } from "@/lib/ai/review";
import { hasCapability } from "@/lib/auth/rbac";

export type AiReviewDecisionState = { ok: boolean; message?: string };

export async function decideAiReviewAction(
  reviewId: string,
  _prev: AiReviewDecisionState,
  formData: FormData,
): Promise<AiReviewDecisionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "applicants:approve")) {
    return { ok: false, message: "レビュー承認権限がありません (CONSULTANT 以上)" };
  }
  const decision = String(formData.get("decision") ?? "") as
    | "APPROVED"
    | "EDITED"
    | "REJECTED";
  if (!["APPROVED", "EDITED", "REJECTED"].includes(decision)) {
    return { ok: false, message: "不正な操作" };
  }
  const finalOutput = String(formData.get("finalOutput") ?? "");
  const note = String(formData.get("note") ?? "") || undefined;
  try {
    await decideAiReview({
      reviewId,
      staffId: session.user.id,
      staffEmail: session.user.email ?? null,
      decision,
      finalOutput: decision === "EDITED" ? finalOutput : undefined,
      note,
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  revalidatePath("/admin/ai-reviews");
  revalidatePath(`/admin/ai-reviews/${reviewId}`);
  return { ok: true, message: `${decision} として記録しました` };
}

/**
 * テスト用: 任意の applicant に対して PENDING な AI レビューを 1 件作る。
 * 実運用では buildDiagnosis 等の AI 出力直後にライブラリ層から自動呼び出しされる前提。
 */
export async function seedAiReviewAction(
  applicantId: string | null,
  kind: "DIAGNOSIS" | "FAX_COVER" | "EMAIL_DRAFT" | "INTERVIEW_SUMMARY",
  aiOutput: string,
): Promise<AiReviewDecisionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "settings:write")) {
    return { ok: false, message: "実行権限がありません (ADMIN 専用)" };
  }
  await createAiReview({
    kind,
    applicantId,
    aiOutput,
  });
  revalidatePath("/admin/ai-reviews");
  return { ok: true, message: "PENDING レビューを 1 件作成しました" };
}
