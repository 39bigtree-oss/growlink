import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailAttachment, EmailMessage } from "../types";

export type SkillSheetInviteInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
  /** /skill-sheet/[token] のフル URL */
  skillSheetUrl: string;
  /** v1.2: AI 適職診断 PDF 等の添付。空なら添付なし。 */
  attachments?: EmailAttachment[];
};

/**
 * スキルシート入力依頼メール。受付直後と「未入力リマインド」両方で使う。
 */
export function buildSkillSheetInviteEmail(input: SkillSheetInviteInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  // Phase 5: ja/en 以外 (vi/id/zh) のメール本文はまだ翻訳していないので ja にフォールバック。
  // 件名・CTA は受信側のメールクライアントで表示される文字列なので、母語崩れリスクを避ける選択。
  const t = locale in TEXTS ? TEXTS[locale as keyof typeof TEXTS] : TEXTS.ja;
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const hasPdf = (input.attachments?.length ?? 0) > 0;
  const pdfNote = hasPdf ? t.pdfNote : null;

  const bodyText = [
    greet,
    "",
    t.body,
    "",
    `${t.linkLabel} ${input.skillSheetUrl}`,
    "",
    ...(pdfNote ? [pdfNote, ""] : []),
    t.expireNotice,
  ].join("\n");

  const bodyHtml = `
    <p>${nl2br(greet)}</p>
    <p>${nl2br(t.body)}</p>
    <p><a href="${input.skillSheetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${t.cta}</a></p>
    ${pdfNote ? `<p style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:10px 12px;margin:12px 0;">${nl2br(pdfNote)}</p>` : ""}
    <p style="color:#6b7280; font-size: 12px;">${nl2br(t.expireNotice)}</p>
  `;

  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.skill_sheet_invite",
    locale,
    applicantId: input.applicantId,
    attachments: input.attachments,
  };
}

type Texts = {
  subject: string;
  greet: (p: { name: string }) => string;
  body: string;
  cta: string;
  linkLabel: string;
  expireNotice: string;
  /** v1.2: 診断 PDF 添付時に本文に挟む案内 */
  pdfNote: string;
};

const TEXTS: Record<"ja" | "en", Texts> = {
  ja: {
    subject: "【Tsumugi】スキルシート入力のお願い & AI 適職診断のご案内",
    greet: ({ name }) => `${name} 様`,
    body: "ご登録ありがとうございます。\nスキルシートのご入力をお願いいたします。途中保存も可能です。\n履歴書 (PDF / 画像) をアップロードいただくと、AI が学歴・職歴を自動抽出します。",
    cta: "スキルシートを入力する",
    linkLabel: "入力リンク:",
    expireNotice: "このリンクは 14 日間有効です。期限切れの場合は担当者へご連絡ください。",
    pdfNote: "本メールに、あなた専用の AI 適職診断結果 (PDF・A4 2 枚) を添付しています。ぜひご一読のうえ、スキルシートのご入力にお進みください。",
  },
  en: {
    subject: "[Tsumugi] Your AI career match + skill sheet request",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for registering. Please complete your skill sheet. You can save your progress and return later.\nIf you upload your resume (PDF / image), our AI will extract your education and career history.",
    cta: "Open my skill sheet",
    linkLabel: "Link:",
    expireNotice: "This link is valid for 14 days. Please contact your consultant if it has expired.",
    pdfNote: "Attached is your personalized AI career match (PDF, 2 pages). Please review it before filling in your skill sheet.",
  },
};
