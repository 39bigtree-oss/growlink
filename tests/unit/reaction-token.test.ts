import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-reaction-token";
});

import { signReactionToken, verifyReactionToken } from "@/lib/fax/reaction-token";

describe("reaction token", () => {
  it("正しい署名のトークンは元の id を返す", () => {
    const token = signReactionToken("fs_abc123");
    expect(verifyReactionToken(token)).toBe("fs_abc123");
  });

  it("壊れた署名は null", () => {
    const token = signReactionToken("fs_abc123");
    const broken = token.slice(0, -1) + "x";
    expect(verifyReactionToken(broken)).toBeNull();
  });

  it("形式異常は null", () => {
    expect(verifyReactionToken("nodelimiter")).toBeNull();
    expect(verifyReactionToken("")).toBeNull();
  });
});
