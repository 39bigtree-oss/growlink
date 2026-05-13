/**
 * Phase 2 で導入する Email レイヤの共通型。
 * テンプレ実装側 (`src/lib/email/templates/*.ts`) が `EmailMessage` を返し、
 * プロバイダ (`mock` / `resend`) が送信する。
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Email テンプレ名。EmailLog.template に保存する識別子。 */
  template: string;
  locale: string;
  applicantId?: string | null;
  /** From を上書きしたい場合のみ。通常は EMAIL_FROM 環境変数を使う。 */
  from?: string;
  /** 返信先。空なら EMAIL_REPLY_TO 環境変数。 */
  replyTo?: string;
};

export type SendResult =
  | { ok: true; provider: string; storedKey?: string }
  | { ok: false; provider: string; error: string };

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<SendResult>;
}
