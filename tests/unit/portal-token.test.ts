import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  signPortalToken,
  verifyPortalTokenSignature,
} from "@/lib/portal/token";

const ORIG_SECRET = process.env.AUTH_SECRET;

describe("Portal token HMAC", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-must-be-long-enough-for-hmac-1234567890";
  });
  afterEach(() => {
    if (ORIG_SECRET === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = ORIG_SECRET;
  });

  it("sign → verify round trip", () => {
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = signPortalToken({ facilityId: "fac-1", expiresAt: exp });
    const r = verifyPortalTokenSignature(token);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.facilityId).toBe("fac-1");
      // expiresAt は秒精度になるので秒比較
      expect(Math.floor(r.expiresAt.getTime() / 1000)).toBe(
        Math.floor(exp.getTime() / 1000),
      );
    }
  });

  it("改ざんすると bad_signature", () => {
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = signPortalToken({ facilityId: "fac-1", expiresAt: exp });
    const parts = token.split(".");
    // facilityId を fac-2 に改ざん
    parts[1] = "fac-2";
    const tampered = parts.join(".");
    const r = verifyPortalTokenSignature(tampered);
    expect(r.ok).toBe(false);
  });

  it("有効期限切れトークンは expired", () => {
    const exp = new Date(Date.now() - 1000);
    const token = signPortalToken({ facilityId: "fac-1", expiresAt: exp });
    const r = verifyPortalTokenSignature(token);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("形式不正は invalid_format", () => {
    const r = verifyPortalTokenSignature("not-a-token");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_format");
  });

  it("AUTH_SECRET が違うサーバで作られたトークンは bad_signature", () => {
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = signPortalToken({ facilityId: "fac-1", expiresAt: exp });
    process.env.AUTH_SECRET = "different-secret-also-long-enough-for-hmac-1234567890";
    const r = verifyPortalTokenSignature(token);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_signature");
  });

  it("AUTH_SECRET 未設定だと sign で例外", () => {
    delete process.env.AUTH_SECRET;
    expect(() =>
      signPortalToken({ facilityId: "fac-1", expiresAt: new Date(Date.now() + 1000) }),
    ).toThrow();
  });
});
