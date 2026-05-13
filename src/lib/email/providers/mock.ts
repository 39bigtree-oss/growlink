import "server-only";

import { randomBytes } from "node:crypto";

import { maskEmail } from "@/lib/mask";
import { saveObject } from "@/lib/storage/local";

import type { EmailMessage, EmailProvider, SendResult } from "../types";

/**
 * 課金される Resend を呼ばずに開発・テストで使う mock プロバイダ。
 *   - 宛先・件名・本文長を console.log
 *   - 完全な .eml 形式で `.storage/sent-emails/{ts}-{rand}.eml` に書き出し
 *   - 失敗系のテストもしたいので EMAIL_MOCK_FAIL=1 で意図的に失敗を返せる
 */
export const mockEmailProvider: EmailProvider = {
  name: "mock",
  async send(msg: EmailMessage): Promise<SendResult> {
    if (process.env.EMAIL_MOCK_FAIL === "1") {
      return { ok: false, provider: "mock", error: "EMAIL_MOCK_FAIL=1" };
    }

    const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const storedKey = `sent-emails/${id}.eml`;
    const eml = renderEml(msg);
    await saveObject(storedKey, Buffer.from(eml, "utf8"));

    console.log("[email:mock] 送信", {
      template: msg.template,
      to: maskEmail(msg.to),
      subject: msg.subject,
      locale: msg.locale,
      bytes: eml.length,
      storedKey,
    });
    return { ok: true, provider: "mock", storedKey };
  },
};

function renderEml(msg: EmailMessage): string {
  const from = msg.from ?? process.env.EMAIL_FROM ?? "Growlink <no-reply@growlink.example>";
  const replyTo = msg.replyTo ?? process.env.EMAIL_REPLY_TO ?? "support@growlink.example";
  // RFC 2822 minimal. multipart/alternative で text + html を両方含める。
  const boundary = `growlink-${randomBytes(8).toString("hex")}`;
  return [
    `From: ${from}`,
    `To: ${msg.to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeMimeHeader(msg.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `X-Growlink-Template: ${msg.template}`,
    `X-Growlink-Locale: ${msg.locale}`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    msg.text,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    msg.html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function encodeMimeHeader(s: string): string {
  // 非 ASCII を含む場合は MIME B-encoding。短文なので Base64 で十分。
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}
