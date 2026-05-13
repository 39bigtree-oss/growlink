/**
 * Phase 2 共通: 最小限の HTML/Text レイアウト。
 * 過剰装飾は避け、テキスト本文と同等の情報量を HTML 側にも入れる。
 */
import { BRAND } from "@/lib/brand";
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

  const productLine = `${BRAND.fullName} — ${locale === "ja" ? BRAND.taglineJa : BRAND.taglineEn}`;
  const text = `${input.bodyText}\n\n—\n${productLine}\n${BRAND.company.nameJa} (${BRAND.company.nameEn})\n${company}\n${contact}`;

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="font-family: -apple-system, system-ui, 'Hiragino Sans', 'Noto Sans JP', sans-serif; line-height: 1.7; color: #1E3A5F; max-width: 640px; margin: 0 auto; padding: 24px; background: #F8F5EE;">
    <div style="background: #ffffff; border-radius: 10px; padding: 28px; border: 1px solid #E2D8C5;">
      <div style="font-size: 12px; letter-spacing: 0.2em; color: #1E3A5F; font-weight: 600;">TSUMUGI</div>
      <div style="margin-top: 16px;">${input.bodyHtml}</div>
    </div>
    <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
      ${escapeHtml(productLine)}<br />
      ${escapeHtml(BRAND.company.nameJa)} (${escapeHtml(BRAND.company.nameEn)})<br />
      ${escapeHtml(contact)}
    </p>
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
