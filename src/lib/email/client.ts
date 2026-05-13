import "server-only";

import { maskEmail } from "@/lib/mask";
import { prisma } from "@/lib/db";

import { mockEmailProvider } from "./providers/mock";
import { createResendProvider } from "./providers/resend";
import type { EmailMessage, EmailProvider, SendResult } from "./types";

let cachedProvider: EmailProvider | null = null;

/**
 * EMAIL_PROVIDER の値に応じてプロバイダを選択する。デフォルトは mock。
 *   - "resend": Resend
 *   - "mock"  : ローカル .eml + console.log
 * キー設定漏れで実 API が呼ばれて課金されないよう、Resend は明示指定時のみ。
 */
export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;
  const choice = process.env.EMAIL_PROVIDER ?? "mock";
  if (choice === "resend") {
    cachedProvider = createResendProvider();
  } else {
    cachedProvider = mockEmailProvider;
  }
  return cachedProvider;
}

/** テスト用: プロバイダキャッシュをリセットする。 */
export function __resetEmailProviderForTests(): void {
  cachedProvider = null;
}

/**
 * 1 通分のメールを送信し、EmailLog に必ず記録する。
 * 成功・失敗いずれでも例外は投げず、結果を返す。呼び出し側が再送判断する。
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const provider = getEmailProvider();
  // 先に "queued" でログを作っておくと、provider 内部でクラッシュしても痕跡が残る。
  const log = await prisma.emailLog.create({
    data: {
      applicantId: msg.applicantId ?? null,
      template: msg.template,
      toMasked: maskEmail(msg.to),
      subject: msg.subject,
      locale: msg.locale,
      provider: provider.name,
      status: "queued",
    },
  });

  const result = await provider.send(msg);
  if (result.ok) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date(), storedKey: result.storedKey ?? null },
    });
  } else {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage: result.error },
    });
  }
  return result;
}
