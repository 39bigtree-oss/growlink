import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type ApplicantReceiptInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
  wantsDiagnosis: boolean;
};

/** Phase 1-3 受付メールを Phase 2 で正式テンプレ化。 */
export function buildApplicantReceiptEmail(input: ApplicantReceiptInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = locale in TEXTS ? TEXTS[locale as keyof typeof TEXTS] : TEXTS.ja;
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const nextStep = input.wantsDiagnosis ? t.nextWithDiagnosis : t.nextWithoutDiagnosis;
  const bodyText = [greet, "", t.body, "", nextStep].join("\n");
  const bodyHtml = `<p>${nl2br(greet)}</p><p>${nl2br(t.body)}</p><p>${nl2br(nextStep)}</p>`;
  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.receipt",
    locale,
    applicantId: input.applicantId,
  };
}

type Texts = {
  subject: string;
  greet: (p: { name: string }) => string;
  body: string;
  nextWithDiagnosis: string;
  nextWithoutDiagnosis: string;
};

const TEXTS: Record<"ja" | "en", Texts> = {
  ja: {
    subject: "【グロウリンク】お申込みを受付ました",
    greet: ({ name }) => `${name} 様`,
    body: "グロウリンクへのお申込みありがとうございます。受付を完了しました。",
    nextWithDiagnosis: "AI 適職診断の結果は数営業日以内にメールでお送りします。",
    nextWithoutDiagnosis: "担当者よりご連絡を差し上げます。",
  },
  en: {
    subject: "[Growlink] Application received",
    greet: ({ name }) => `Dear ${name},`,
    body: "Thank you for applying to Growlink. We have received your application.",
    nextWithDiagnosis: "We will email your AI career match result within a few business days.",
    nextWithoutDiagnosis: "Your consultant will be in touch shortly.",
  },
};
