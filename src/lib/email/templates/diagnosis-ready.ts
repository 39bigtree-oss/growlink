import "server-only";

import { resolveLocale } from "@/lib/i18n/config";

import { nl2br, renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type DiagnosisReadyInput = {
  applicantId: string;
  to: string;
  lastName: string;
  firstName: string;
  locale: string;
  /** トップ業態 1 件のサマリ。Phase 1-4 の結果から抜粋。 */
  topRank: string;
  topCategoryLabel: string;
  /** /skill-sheet/[token] のフル URL */
  skillSheetUrl: string;
};

/** AI 適職診断が終わったことを通知し、続けてスキルシートを書いてもらう。 */
export function buildDiagnosisReadyEmail(input: DiagnosisReadyInput): EmailMessage {
  const locale = resolveLocale(input.locale);
  const t = TEXTS[locale];
  const greet = t.greet({ name: `${input.lastName} ${input.firstName}` });
  const summary = t.summary({ category: input.topCategoryLabel, rank: input.topRank });
  const bodyText = [greet, "", t.intro, "", summary, "", t.next, "", `${t.linkLabel} ${input.skillSheetUrl}`].join("\n");
  const bodyHtml = `
    <p>${nl2br(greet)}</p>
    <p>${nl2br(t.intro)}</p>
    <p style="background:#f3f4f6;padding:12px;border-radius:6px;">${nl2br(summary)}</p>
    <p>${nl2br(t.next)}</p>
    <p><a href="${input.skillSheetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${t.cta}</a></p>
  `;
  const { html, text } = renderLayout({ locale, bodyText, bodyHtml });
  return {
    to: input.to,
    subject: t.subject,
    html,
    text,
    template: "applicant.diagnosis_ready",
    locale,
    applicantId: input.applicantId,
  };
}

type Texts = {
  subject: string;
  greet: (p: { name: string }) => string;
  intro: string;
  summary: (p: { category: string; rank: string }) => string;
  next: string;
  cta: string;
  linkLabel: string;
};

const TEXTS: Record<"ja" | "en", Texts> = {
  ja: {
    subject: "【グロウリンク】AI 適職診断の結果",
    greet: ({ name }) => `${name} 様`,
    intro: "AI 適職診断が完了しました。結果のハイライトをお知らせいたします。",
    summary: ({ category, rank }) => `最も適性が高い業態: ${category}\nランク: ${rank}`,
    next: "より精度の高いご紹介のため、続けてスキルシートのご入力をお願いいたします。",
    cta: "スキルシートを入力する",
    linkLabel: "入力リンク:",
  },
  en: {
    subject: "[Growlink] Your AI career match result",
    greet: ({ name }) => `Dear ${name},`,
    intro: "Your AI career match has been generated. Here is a quick summary.",
    summary: ({ category, rank }) => `Top match: ${category}\nRank: ${rank}`,
    next: "To improve our referrals, please continue with the skill sheet.",
    cta: "Open my skill sheet",
    linkLabel: "Link:",
  },
};
