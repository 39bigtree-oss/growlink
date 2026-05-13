import "server-only";

// reCAPTCHA v3 のサーバ側検証。
// 本番では RECAPTCHA_SECRET_KEY を設定して使う。未設定環境ではガードして素通しする。

const MIN_SCORE = 0.5;

export type RecaptchaResult =
  | { skipped: true; reason: "no_secret" }
  | { ok: true; score: number; action: string | null }
  | { ok: false; reason: string };

export async function verifyRecaptchaToken(token: string | null | undefined): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return { skipped: true, reason: "no_secret" };
  }
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    return { ok: false, reason: `verify_http_${res.status}` };
  }
  const json = (await res.json()) as {
    success: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };
  if (!json.success) {
    return { ok: false, reason: json["error-codes"]?.join(",") ?? "verify_failed" };
  }
  const score = typeof json.score === "number" ? json.score : 0;
  if (score < MIN_SCORE) {
    return { ok: false, reason: `low_score_${score}` };
  }
  return { ok: true, score, action: json.action ?? null };
}
