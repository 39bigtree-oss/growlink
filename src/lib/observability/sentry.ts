/**
 * Phase 5: Sentry 連携の雛形。
 * - SENTRY_DSN がない場合は no-op。実依存 (`@sentry/nextjs`) を必須にしない。
 * - 既存コードはこの captureException を直接呼べる。
 */

export type CaptureContext = Record<string, unknown>;

export function captureException(err: unknown, ctx?: CaptureContext): void {
  // 本番では @sentry/nextjs を install して Sentry.captureException(err, { extra: ctx }) を呼ぶ。
  // ここでは DSN 未設定でも壊れない代わりに console に出力するだけ。
  if (!process.env.SENTRY_DSN) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[sentry:stub]", { err: String(err), ctx });
    }
    return;
  }
  // 将来の実装場所。ここで dynamic import 経由で @sentry/nextjs を呼ぶ。
  console.warn("[sentry] DSN configured but stub still active. Install @sentry/nextjs.");
}

export function setUserContext(user: { id?: string; role?: string } | null): void {
  if (!process.env.SENTRY_DSN) return;
  console.warn("[sentry:stub] setUserContext", user);
}
