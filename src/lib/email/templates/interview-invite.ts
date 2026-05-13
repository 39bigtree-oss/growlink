import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type InterviewInviteInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
  interviewUrl: string;
};

export function buildInterviewInviteEmail(input: InterviewInviteInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = locale in TEXTS ? TEXTS[locale as keyof typeof TEXTS] : TEXTS.ja;
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const bodyText = [greet, "", t.body, "", `${t.linkLabel} ${input.interviewUrl}`, "", t.notice].join("\n");
  const bodyHtml = `
    <p>${nl2br(greet)}</p>
    <p>${nl2br(t.body)}</p>
    <p><a href="${input.interviewUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${t.cta}</a></p>
    <p style="color:#6b7280; font-size: 12px;">${nl2br(t.notice)}</p>
  `;
  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.interview_invite",
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
  notice: string;
};

const TEXTS: Record<"ja" | "en", Texts> = {
  ja: {
    subject: "【グロウリンク】AI 電話面接のご案内",
    greet: ({ name }) => `${name} 様`,
    body: "スキルシートをご提出いただきありがとうございます。\n続いて AI による短い面接 (5 問程度・10〜15 分) を実施いたします。\n下記リンクからお好きなタイミングで開始できます。",
    cta: "面接を開始する",
    linkLabel: "面接リンク:",
    notice: "リンクは 14 日間有効です。期限切れの場合は担当者へご連絡ください。",
  },
  en: {
    subject: "[Growlink] Your AI interview is ready",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for submitting your skill sheet. Next, please complete a short AI interview (around 5 questions, 10-15 minutes).\nYou can start any time from the link below.",
    cta: "Start the interview",
    linkLabel: "Interview link:",
    notice: "This link is valid for 14 days. Please contact your consultant if it has expired.",
  },
};
