import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Phase 4: 反応 (返信) URL の署名付きトークン。
 * `<faxSheetId>.<base64url(hmac)>` の形で発行し、`/feedback/[token]` で検証する。
 *
 * AUTH_SECRET を流用 (Phase 1-1 で設定済み)。
 *
 * 期限管理はしない (FAX 反応は数ヶ月後でも受け取りたい)。Revoke したい場合は
 * FaxSheet.status を変更するなど別レイヤーで対応する。
 */

const SECRET = process.env.AUTH_SECRET ?? "growlink-dev-secret";

export function signReactionToken(faxSheetId: string): string {
  const sig = createHmac("sha256", SECRET).update(faxSheetId).digest("base64url");
  return `${faxSheetId}.${sig}`;
}

export function verifyReactionToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(id).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? id : null;
}
