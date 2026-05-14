import "server-only";

import { renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type ResidenceExpiryAlertInput = {
  applicantId: string;
  applicantInitials: string;
  visaType: string;
  expireAt: Date;
  daysUntilExpiry: number;
  to?: string;
};

/**
 * 在留期限アラート: 90 / 30 / 7 日前に担当営業へ送信。
 * 本文に氏名は書かない (社内通知でも PII を最小化)。
 */
export function buildResidenceExpiryAlertEmail(
  input: ResidenceExpiryAlertInput,
): EmailMessage {
  const to = input.to ?? process.env.STAFF_NOTIFICATION_EMAIL ?? "staff@growlink.example";
  const dateStr = input.expireAt.toISOString().slice(0, 10);
  const subject = `[Tsumugi] 在留期限まで ${input.daysUntilExpiry} 日 — 申込 ${input.applicantInitials}`;
  const bodyText = [
    `${input.applicantInitials} さん (申込 ID: ${input.applicantId}) の在留資格 (${input.visaType}) の`,
    `有効期限が ${dateStr} に切れます (残り ${input.daysUntilExpiry} 日)。`,
    "",
    "更新手続きのフォローまたは雇用継続可否の確認をお願いします。",
    "管理画面: /admin/applicants/" + input.applicantId,
  ].join("\n");
  const bodyHtml = `
    <p>
      <strong>${input.applicantInitials}</strong> さん (申込 ID:
      <code>${input.applicantId}</code>) の在留資格
      <strong>${input.visaType}</strong> の有効期限が
      <strong>${dateStr}</strong> に切れます
      (残り <strong>${input.daysUntilExpiry}</strong> 日)。
    </p>
    <p>更新手続きのフォローまたは雇用継続可否の確認をお願いします。</p>
  `;
  const { html, text } = renderLayout({ locale: "ja", bodyText, bodyHtml });
  return {
    to,
    subject,
    html,
    text,
    template: "compliance.residence_expiry",
    locale: "ja",
    applicantId: input.applicantId,
  };
}
