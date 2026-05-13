import { beforeEach, describe, expect, it } from "vitest";

import { __resetRateLimit, ipKey, rateLimit } from "@/lib/security/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("limit 内は ok=true、超えると ok=false", () => {
    const key = "test:bucket-1";
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });

  it("remaining が正しくデクリメントされる", () => {
    const key = "test:bucket-2";
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("ipKey が x-forwarded-for から IP を抽出", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(ipKey(req, "apply")).toBe("ip:203.0.113.7:apply");
  });

  it("ipKey は IP がなければ anon", () => {
    const req = new Request("http://localhost/");
    expect(ipKey(req, "x")).toBe("ip:anon:x");
  });
});
