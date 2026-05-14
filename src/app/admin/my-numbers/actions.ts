"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { recordAuditEvent } from "@/lib/audit/event";
import { hasCapability } from "@/lib/auth/rbac";
import { decryptMyNumber, maskMyNumber } from "@/lib/compliance/my-number";
import { getMyNumberOcrProvider } from "@/lib/compliance/my-number-ocr";
import { prisma } from "@/lib/db";
import {
  findMyNumberByApplicantId,
  recordMyNumberAccess,
  upsertMyNumber,
} from "@/lib/repositories/my-number";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import {
  myNumberAccessSchema,
  myNumberCreateInputSchema,
  myNumberPlainSchema,
} from "@/lib/schemas/my-number";
import { MyNumberPurpose } from "@prisma/client";

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

export type MyNumberCreateState = { ok: boolean; message?: string };

/**
 * マイナンバー登録 (新規 + 上書き両対応)。
 * 平文入力 or OCR 取込のどちらでも受け付ける。即座に AES-256-GCM 暗号化し、
 * 平文は DB / ログ / メールに残さない。
 */
export async function registerMyNumberAction(
  applicantId: string,
  _prev: MyNumberCreateState,
  formData: FormData,
): Promise<MyNumberCreateState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "my-number:write")) {
    return { ok: false, message: "マイナンバー登録権限がありません (ADMIN 専用)" };
  }

  const plainInput = String(formData.get("plainNumber") ?? "").replace(/\s|-/g, "");
  const purpose = String(formData.get("purpose") ?? "WITHHOLDING") as MyNumberPurpose;
  const retentionUntilRaw = String(formData.get("retentionUntil") ?? "");
  if (!retentionUntilRaw) {
    return { ok: false, message: "保管期限を入力してください" };
  }

  let plain = plainInput;

  // OCR 経由の場合は formData に "ocrFile" が乗っている
  const file = formData.get("ocrFile");
  if (file && file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "マイナンバーカードの画像 (image/*) を添付してください" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, message: "画像サイズが大きすぎます (5MB 以下)" };
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const ocr = await getMyNumberOcrProvider().recognize({
        bytes: buf,
        mimeType: file.type,
        fileName: file.name,
      });
      if (!myNumberPlainSchema.safeParse(ocr.detectedNumber).success) {
        return {
          ok: false,
          message: `OCR で 12 桁の数字を検出できませんでした (検出: ${ocr.detectedNumber}, 信頼度 ${(ocr.confidence * 100).toFixed(0)}%)`,
        };
      }
      plain = ocr.detectedNumber;
    } catch (err) {
      return { ok: false, message: `OCR 失敗: ${(err as Error).message}` };
    }
  }

  const parsed = myNumberCreateInputSchema.safeParse({
    applicantId,
    plainNumber: plain,
    purpose,
    retentionUntil: retentionUntilRaw,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }

  try {
    const record = await upsertMyNumber({
      applicantId: parsed.data.applicantId,
      plainNumber: parsed.data.plainNumber,
      purpose: parsed.data.purpose,
      retentionUntil: parsed.data.retentionUntil,
    });
    await Promise.all([
      recordAuditLog({
        staffId: session.user.id,
        action: "my_number.register",
        target: applicantId,
        payload: { purpose: parsed.data.purpose, viaOcr: !!(file instanceof File && file.size > 0) },
      }),
      recordAuditEvent(prisma, {
        actorStaffId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: "my_number.register",
        entityType: "MyNumberRecord",
        entityId: record.id,
        after: { applicantId, purpose: parsed.data.purpose },
      }),
    ]);
  } catch (err) {
    return { ok: false, message: `登録失敗: ${(err as Error).message}` };
  }

  revalidatePath("/admin/my-numbers");
  revalidatePath(`/admin/my-numbers/${applicantId}`);
  redirect(`/admin/my-numbers/${applicantId}`);
}
