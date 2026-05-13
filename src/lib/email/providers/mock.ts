import "server-only";

import { randomBytes } from "node:crypto";

import { maskEmail } from "@/lib/mask";
import { saveObject } from "@/lib/storage/local";

import type { EmailAttachment, EmailMessage, EmailProvider, SendResult } from "../types";

/**
 * 課金される Resend を呼ばずに開発・テストで使う mock プロバイダ。
 *   - 宛先・件名・本文長を console.log
 *   - 完全な .eml 形式で `.storage/sent-emails/{ts}-{rand}.eml` に書き出し
 *   - 失敗系のテストもしたいので EMAIL_MOCK_FAIL=1 で意図的に失敗を返せる
 *   - v1.2: attachments があれば multipart/mixed で添付ファイルも含める
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
      attachments: msg.attachments?.length ?? 0,
      storedKey,
    });
    return { ok: true, provider: "mock", storedKey };
  },
};

/**
 * RFC 2822 / 2045 準拠の .eml を組み立てる。
 *
 *   attachments 無し: multipart/alternative (text + html)
 *   attachments 有り: multipart/mixed
 *                      ├ multipart/alternative (text + html)
 *                      └ application/pdf 等の各 attachment (base64)
 *
 * 実 MUA (Outlook / Apple Mail) で開いて添付が見えることを目視確認済み。
 */
function renderEml(msg: EmailMessage): string {
  const from = msg.from ?? process.env.EMAIL_FROM ?? "Growlink <no-reply@growlink.example>";
  const replyTo = msg.replyTo ?? process.env.EMAIL_REPLY_TO ?? "support@growlink.example";
  const hasAttachments = !!msg.attachments && msg.attachments.length > 0;

  const altBoundary = `growlink-alt-${randomBytes(6).toString("hex")}`;
  const altPart = buildAltPart(altBoundary, msg.text, msg.html);

  if (!hasAttachments) {
    return [
      `From: ${from}`,
      `To: ${msg.to}`,
      `Reply-To: ${replyTo}`,
      `Subject: ${encodeMimeHeader(msg.subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      `X-Growlink-Template: ${msg.template}`,
      `X-Growlink-Locale: ${msg.locale}`,
      "",
      altPart,
    ].join("\r\n");
  }

  // multipart/mixed: 本文 (alternative) + 添付
  const mixedBoundary = `growlink-mixed-${randomBytes(6).toString("hex")}`;
  const parts: string[] = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    altPart,
  ];
  for (const att of msg.attachments!) {
    parts.push(...buildAttachmentPart(mixedBoundary, att));
  }
  parts.push(`--${mixedBoundary}--`, "");

  return [
    `From: ${from}`,
    `To: ${msg.to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeMimeHeader(msg.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    `X-Growlink-Template: ${msg.template}`,
    `X-Growlink-Locale: ${msg.locale}`,
    "",
    ...parts,
  ].join("\r\n");
}

function buildAltPart(boundary: string, text: string, html: string): string {
  return [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    text,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function buildAttachmentPart(boundary: string, att: EmailAttachment): string[] {
  const base64 = att.content.toString("base64");
  // 76 文字ごとに改行 (RFC 2045 § 6.8)
  const chunked = base64.replace(/(.{76})/g, "$1\r\n");
  return [
    `--${boundary}`,
    `Content-Type: ${att.contentType}; name="${att.filename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${att.filename}"`,
    "",
    chunked,
    "",
  ];
}

function encodeMimeHeader(s: string): string {
  // 非 ASCII を含む場合は MIME B-encoding。短文なので Base64 で十分。
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}
