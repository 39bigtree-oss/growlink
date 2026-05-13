/**
 * Phase 2 共通: 最小限の HTML/Text レイアウト。
 * 過剰装飾は避け、テキスト本文と同等の情報量を HTML 側にも入れる。
 */
import { resolveLocale, type SupportedLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

export type LayoutInput = {
  locale: string;
  bodyText: string;
  bodyHtml: string;
};

export function renderLayout(input: LayoutInput): { html: string; text: string } {
  const locale: SupportedLocale = resolveLocale(input.locale);
  const messages = getMessages(locale) as {
    email: { footer: { company: string; contact: string } };
  };
  const company = messages.email.footer.company;
  const contact = messages.email.footer.contact;

  const text = `${input.bodyText}\n\n—\n${company}\n${contact}`;

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="font-family: -apple-system, system-ui, 'Hiragino Sans', sans-serif; line-height: 1.7; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
    ${input.bodyHtml}
    <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="color: #6b7280; font-size: 12px;">${escapeHtml(company)}<br />${escapeHtml(contact)}</p>
  </body>
</html>`;

  return { html, text };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br />");
}
