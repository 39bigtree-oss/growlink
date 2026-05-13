import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type SkillSheetInviteInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
  /** /skill-sheet/[token] のフル URL */
  skillSheetUrl: string;
};

/**
 * スキルシート入力依頼メール。受付直後と「未入力リマインド」両方で使う。
 */
export function buildSkillSheetInviteEmail(input: SkillSheetInviteInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = TEXTS[locale];
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });

  const bodyText = [
    greet,
    "",
    t.body,
    "",
    `${t.linkLabel} ${input.skillSheetUrl}`,
    "",
    t.expireNotice,
  ].join("\n");

  const bodyHtml = `
    <p>${nl2br(greet)}</p>
    <p>${nl2br(t.body)}</p>
    <p><a href="${input.skillSheetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${t.cta}</a></p>
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
  };
}

type Texts = {
  subject: string;
  greet: (p: { name: string }) => string;
  body: string;
  cta: string;
  linkLabel: string;
  expireNotice: string;
};

const TEXTS: Record<"ja" | "en", Texts> = {
  ja: {
    subject: "【グロウリンク】スキルシート入力のお願い",
    greet: ({ name }) => `${name} 様`,
    body: "ご応募ありがとうございます。\nスキルシートのご入力をお願いいたします。途中保存も可能です。\n履歴書 (PDF / 画像) をアップロードいただくと、AI が学歴・職歴を自動抽出します。",
    cta: "スキルシートを入力する",
    linkLabel: "入力リンク:",
    expireNotice: "このリンクは 14 日間有効です。期限切れの場合は担当者へご連絡ください。",
  },
  en: {
    subject: "[Growlink] Please complete your skill sheet",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for applying. Please complete your skill sheet. You can save your progress and return later.\nIf you upload your resume (PDF / image), our AI will extract your education and career history.",
    cta: "Open my skill sheet",
    linkLabel: "Link:",
    expireNotice: "This link is valid for 14 days. Please contact your consultant if it has expired.",
  },
};
