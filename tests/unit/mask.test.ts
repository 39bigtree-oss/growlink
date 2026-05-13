import { describe, it, expect } from "vitest";

import { maskEmail, maskName, maskPhone } from "@/lib/mask";

describe("maskEmail", () => {
  it("ローカル部の先頭と末尾だけ残す", () => {
    expect(maskEmail("hanako@example.com")).toBe("h***o@example.com");
  });
  it("短いローカル部でも例外を投げない", () => {
    expect(maskEmail("a@x.com")).toBe("a***@x.com");
  });
  it("null は空文字", () => {
    expect(maskEmail(null)).toBe("");
  });
});

describe("maskName", () => {
  it("各単語の先頭以外を伏字にする", () => {
    expect(maskName("山田 花子")).toBe("山* 花*");
  });
});

describe("maskPhone", () => {
  it("末尾 4 桁だけ残す", () => {
    expect(maskPhone("090-1234-5678")).toBe("*******5678");
  });
});
