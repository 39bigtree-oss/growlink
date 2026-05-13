/**
 * Phase v1: 簡易レート制限。
 *
 * 設計判断 (Recommended):
 *  - 依存追加なし (Upstash や Redis に縛らない)。インメモリの固定窓カウンタ
 *  - 単一プロセス前提の本番では Redis ベースに差し替える前提のシグネチャ
 *  - サーバレス (Vercel) ではプロセスをまたぐ制限にならない点を README に明記
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = { count: number; expiresAt: number };

const STORE = new Map<string, Bucket>();

/**
 * @param key   "ip:127.0.0.1:apply" など、対象 + 操作の識別子
 * @param limit 窓内の許容回数
 * @param windowMs 窓のサイズ (ミリ秒)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = STORE.get(key);
  if (!bucket || bucket.expiresAt < now) {
    STORE.set(key, { count: 1, expiresAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.expiresAt };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.expiresAt };
}

/**
 * テスト用にすべてのバケットをクリア。
 */
export function __resetRateLimit(): void {
  STORE.clear();
}

/** リクエストから「対象キー」を作る。IP がなければ匿名扱い。 */
export function ipKey(req: Request, suffix: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  const ip = fwd?.split(",")[0]?.trim() ?? "anon";
  return `ip:${ip}:${suffix}`;
}
