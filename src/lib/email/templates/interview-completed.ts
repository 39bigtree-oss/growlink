import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type InterviewCompletedInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
};

export function buildInterviewCompletedEmail(input: InterviewCompletedInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = locale in TEXTS ? TEXTS[locale as keyof typeof TEXTS] : TEXTS.ja;
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const bodyText = [greet, "", t.body].join("\n");
  const bodyHtml = `<p>${nl2br(greet)}</p><p>${nl2br(t.body)}</p>`;
  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.interview_completed",
    locale,
    applicantId: input.applicantId,
  };
}

const TEXTS: Record<"ja" | "en", { subject: string; greet: (p: { name: string }) => string; body: string }> = {
  ja: {
    subject: "【グロウリンク】AI 面接ありがとうございました",
    greet: ({ name }) => `${name} 様`,
    body: "AI 面接にご協力いただきありがとうございました。\n内容を確認のうえ、担当者よりご紹介や追加面談のご連絡を差し上げます。",
  },
  en: {
    subject: "[Growlink] Thank you for the AI interview",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for completing the AI interview. We will review the content and your consultant will contact you about referrals or follow-up.",
  },
};
