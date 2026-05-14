"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { decryptMyNumber, maskMyNumber } from "@/lib/compliance/my-number";
import { prisma } from "@/lib/db";
import {
  findMyNumberByApplicantId,
  recordMyNumberAccess,
} from "@/lib/repositories/my-number";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { myNumberAccessSchema } from "@/lib/schemas/my-number";

export type MyNumberRevealResult = {
  ok: boolean;
  message?: string;
  /** ADMIN だけが復号した平文を取得できる。CONSULTANT 以下はマスクのみ */
  plain?: string;
  /** 全ロール共通でマスク表示 */
  masked?: string;
};

/**
 * マイナンバーを「閲覧」する。理由必須 + アクセスログ + AuditEvent。
 * 平文の復号は ADMIN のみ。CONSULTANT 以下はマスク文字列のみ返す。
 */
export async function revealMyNumberAction(
  applicantId: string,
  formData: FormData,
): Promise<MyNumberRevealResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "my-number:read")) {
    return { ok: false, message: "マイナンバー閲覧権限がありません" };
  }

  const reason = String(formData.get("reason") ?? "");
  const parsed = myNumberAccessSchema.safeParse({
    staffId: session.user.id,
    action: "VIEW",
    reason,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }

  const record = await findMyNumberByApplicantId(applicantId);
  if (!record) return { ok: false, message: "マイナンバーが登録されていません" };

  try {
    const plain = decryptMyNumber(record.encryptedNumber);
    const masked = maskMyNumber(plain);

    await recordMyNumberAccess({
      myNumberRecordId: record.id,
      staffId: session.user.id,
      action: "VIEW",
      reason: parsed.data.reason,
    });
    await Promise.all([
      recordAuditLog({
        staffId: session.user.id,
        action: "my_number.view",
        target: applicantId,
        payload: { reason: parsed.data.reason },
      }),
      recordAuditEvent(prisma, {
        actorStaffId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: "my_number.view",
        entityType: "MyNumberRecord",
        entityId: record.id,
        after: { reason: parsed.data.reason, applicantId },
      }),
    ]);
    revalidatePath(`/admin/my-numbers/${applicantId}`);
    return {
      ok: true,
      message: `アクセスを記録しました (${parsed.data.reason})`,
      plain: session.user.role === "ADMIN" ? plain : undefined,
      masked,
    };
  } catch (err) {
    return { ok: false, message: `復号に失敗しました: ${(err as Error).message}` };
  }
}
