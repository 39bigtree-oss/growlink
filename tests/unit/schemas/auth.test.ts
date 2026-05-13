import { describe, it, expect } from "vitest";

import { credentialsLoginSchema, magicLinkLoginSchema } from "@/lib/schemas/auth";

describe("credentialsLoginSchema", () => {
  it("正しいメールアドレスと8文字以上のパスワードを許可する", () => {
    const r = credentialsLoginSchema.safeParse({
      email: "admin@example.com",
      password: "password1",
    });
    expect(r.success).toBe(true);
  });

  it("メールアドレス形式不正を拒否する", () => {
    const r = credentialsLoginSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(r.success).toBe(false);
  });

  it("パスワードが8文字未満なら拒否する", () => {
    const r = credentialsLoginSchema.safeParse({
      email: "admin@example.com",
      password: "short",
    });
    expect(r.success).toBe(false);
  });
});

describe("magicLinkLoginSchema", () => {
  it("メールアドレスのみで通る", () => {
    const r = magicLinkLoginSchema.safeParse({ email: "user@example.com" });
    expect(r.success).toBe(true);
  });

  it("メールアドレス形式不正を拒否する", () => {
    const r = magicLinkLoginSchema.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
  });
});
