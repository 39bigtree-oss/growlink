import "server-only";

import { maskEmail, maskName } from "@/lib/mask";

export type ReceiptEmailInput = {
  applicantId: string;
  email: string;
  lastName: string;
  firstName: string;
  language?: string | null;
  wantsDiagnosis: boolean;
};

// Phase 1-3 暫定: 実送信せずログのみ。Resend 連携は Phase 1-5 で追加。
export async function sendReceiptEmail(input: ReceiptEmailInput): Promise<void> {
  const body = renderReceiptBody(input);

  // PII を直接ログに出さない（マスク済みのみ）。
  console.log("[receipt-email] stub send", {
    applicantId: input.applicantId,
    to: maskEmail(input.email),
    name: maskName(`${input.lastName} ${input.firstName}`),
    wantsDiagnosis: input.wantsDiagnosis,
    bodyChars: body.length,
  });
}

// 管理者向け通知。受付があった旨だけ伝え、本文に氏名は乗せない。
export async function sendStaffNotificationEmail(input: { applicantId: string }): Promise<void> {
  console.log("[staff-notification] stub send", {
    applicantId: input.applicantId,
    subject: "[グロウリンク] 新規申込あり",
  });
}

function renderReceiptBody(input: ReceiptEmailInput): string {
  const nextStep = input.wantsDiagnosis
    ? "AI 適職診断の結果は数営業日以内にメールでお送りします。"
    : "担当者よりご連絡を差し上げます。";
  return [
    `${input.lastName} ${input.firstName} 様`,
    "",
    "グロウリンクへのお申込みありがとうございます。",
    "受付を完了しました。",
    "",
    nextStep,
    "",
    "本メールは送信専用です。お問い合わせは別途お送りください。",
    "",
    "— グロウリンク",
  ].join("\n");
}
