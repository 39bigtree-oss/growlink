import "server-only";

import { Resend } from "resend";

import type { EmailMessage, EmailProvider, SendResult } from "../types";

/**
 * Resend を使う本番プロバイダ。
 * RESEND_API_KEY が無い場合は呼ぶ前に getEmailProvider() が mock を選ぶので、
 * ここではキー無しでは初期化しない (起動時 crash 防止)。
 */
export function createResendProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  const client = new Resend(apiKey);

  return {
    name: "resend",
    async send(msg: EmailMessage): Promise<SendResult> {
      const from = msg.from ?? process.env.EMAIL_FROM ?? "Growlink <no-reply@growlink.example>";
      const replyTo = msg.replyTo ?? process.env.EMAIL_REPLY_TO;
      try {
        const res = await client.emails.send({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          replyTo,
          headers: {
            "X-Growlink-Template": msg.template,
            "X-Growlink-Locale": msg.locale,
          },
        });
        if (res.error) {
          return { ok: false, provider: "resend", error: res.error.message };
        }
        return { ok: true, provider: "resend" };
      } catch (err) {
        return { ok: false, provider: "resend", error: (err as Error).message };
      }
    },
  };
}
