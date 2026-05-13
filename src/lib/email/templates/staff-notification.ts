import "server-only";

import { renderLayout } from "./_layout";
import type { EmailMessage } from "../types";

export type StaffNotificationInput = {
  applicantId: string;
  /** スタッフ宛配信先。STAFF_NOTIFICATION_EMAIL があれば優先。 */
  to?: string;
  subject?: string;
  body?: string;
};

/** 「新規申込が来た」など、社内宛の汎用通知。氏名・電話は本文に書かない。 */
export function buildStaffNotificationEmail(input: StaffNotificationInput): EmailMessage {
  const to = input.to ?? process.env.STAFF_NOTIFICATION_EMAIL ?? "staff@growlink.example";
  const subject = input.subject ?? "[グロウリンク] 新規申込あり";
  const body =
    input.body ??
    `新規申込が登録されました。\n申込ID: ${input.applicantId}\n管理画面でご確認ください。`;
  const { html, text } = renderLayout({ locale: "ja", bodyText: body, bodyHtml: `<p>${body.replace(/\n/g, "<br/>")}</p>` });
  return {
    to,
    subject,
    html,
    text,
    template: "staff.notification",
    locale: "ja",
    applicantId: input.applicantId,
  };
}
