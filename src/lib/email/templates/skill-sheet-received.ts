import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type SkillSheetReceivedInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
};

/** スキルシート提出を受け付けたことを求職者へ知らせる。 */
export function buildSkillSheetReceivedEmail(input: SkillSheetReceivedInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = TEXTS[locale];
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const bodyText = [greet, "", t.body].join("\n");
  const bodyHtml = `<p>${nl2br(greet)}</p><p>${nl2br(t.body)}</p>`;
  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.skill_sheet_received",
    locale,
    applicantId: input.applicantId,
  };
}

const TEXTS: Record<"ja" | "en", { subject: string; greet: (p: { name: string }) => string; body: string }> = {
  ja: {
    subject: "【グロウリンク】スキルシートを受領しました",
    greet: ({ name }) => `${name} 様`,
    body: "スキルシートをご提出いただきありがとうございます。\n内容を確認のうえ、担当者より AI 電話面接または個別ご連絡を差し上げます。",
  },
  en: {
    subject: "[Growlink] We received your skill sheet",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for submitting your skill sheet. We will review the content and your consultant will reach out for an AI phone interview or further communication.",
  },
};
