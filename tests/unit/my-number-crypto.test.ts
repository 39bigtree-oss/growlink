import { beforeAll, describe, expect, it } from "vitest";

import {
  decryptMyNumber,
  encryptMyNumber,
  maskMyNumber,
  validateMyNumberFormat,
} from "@/lib/compliance/my-number";

// テスト用固定鍵 (本番では絶対に使用しない / .env.example に明記する想定)
const TEST_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

beforeAll(() => {
  process.env.MYNUMBER_ENCRYPTION_KEY = TEST_KEY;
});

describe("encrypt/decrypt my number", () => {
  it("round trip で同じ平文を復号できる", () => {
    const plain = "123456789012";
    const cipher = encryptMyNumber(plain);
    expect(cipher).not.toContain(plain);
    expect(decryptMyNumber(cipher)).toBe(plain);
  });

  it("毎回 IV がランダムなので暗号文は変わる", () => {
    const plain = "123456789012";
    const c1 = encryptMyNumber(plain);
    const c2 = encryptMyNumber(plain);
    expect(c1).not.toBe(c2);
    expect(decryptMyNumber(c1)).toBe(plain);
    expect(decryptMyNumber(c2)).toBe(plain);
  });

  it("鍵を変更すると復号に失敗する (改ざん検知)", () => {
    const plain = "123456789012";
    const cipher = encryptMyNumber(plain);
    const orig = process.env.MYNUMBER_ENCRYPTION_KEY;
    process.env.MYNUMBER_ENCRYPTION_KEY =
      "ff112233445566778899aabbccddeeff00112233445566778899aabbccddee00";
    expect(() => decryptMyNumber(cipher)).toThrow();
    process.env.MYNUMBER_ENCRYPTION_KEY = orig;
  });

  it("形式が不正な平文は暗号化拒否", () => {
    expect(() => encryptMyNumber("12345")).toThrow();
    expect(() => encryptMyNumber("1234567890abc")).toThrow();
  });

  it("形式が不正な packed は復号拒否", () => {
    expect(() => decryptMyNumber("invalid")).toThrow();
    expect(() => decryptMyNumber("aa:bb")).toThrow();
  });

  it("鍵未設定なら例外", () => {
    const orig = process.env.MYNUMBER_ENCRYPTION_KEY;
    delete process.env.MYNUMBER_ENCRYPTION_KEY;
    expect(() => encryptMyNumber("123456789012")).toThrow(/MYNUMBER_ENCRYPTION_KEY/);
    process.env.MYNUMBER_ENCRYPTION_KEY = orig;
  });
});

describe("validate/mask my number", () => {
  it("12 桁数字のみ valid", () => {
    expect(validateMyNumberFormat("123456789012")).toBe(true);
    expect(validateMyNumberFormat("12345678901")).toBe(false);
    expect(validateMyNumberFormat("1234567890ab")).toBe(false);
  });

  it("マスク: 下 4 桁のみ露出", () => {
    expect(maskMyNumber("123456789012")).toBe("********9012");
    expect(maskMyNumber(null)).toBe("************");
    expect(maskMyNumber("short")).toBe("************");
  });
});
