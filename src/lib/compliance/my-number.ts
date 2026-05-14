import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * マイナンバー (特定個人情報) の AES-256-GCM 暗号化。
 *
 * 鍵: MYNUMBER_ENCRYPTION_KEY (環境変数, hex 64 文字 = 32 byte)
 * 形式: "iv(24hex):tag(32hex):ciphertext(hex)"  ← DB にはこの文字列を保存
 *
 * 本番では KMS から鍵を都度引いてくる envelope encryption に切り替える (v1.8)。
 * dev / test 用の固定鍵は .env.example に明記。
 */

const ALG = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const hex = process.env.MYNUMBER_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("MYNUMBER_ENCRYPTION_KEY is not set");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("MYNUMBER_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptMyNumber(plain: string): string {
  if (!/^\d{12}$/.test(plain)) {
    throw new Error("My Number must be 12 digits");
  }
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptMyNumber(packed: string): string {
  const [ivHex, tagHex, cipherHex] = packed.split(":");
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error("Invalid encrypted my number format");
  }
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/**
 * 12 桁の形式チェック + (簡易) チェックデジット検証。
 * 厳密な M.Z 行列計算は v1.6 で。
 */
export function validateMyNumberFormat(s: string): boolean {
  return /^\d{12}$/.test(s);
}

/**
 * 表示用のマスク (下 4 桁のみ表示)。
 * 例: "123456789012" → "********9012"
 */
export function maskMyNumber(plainOrEmpty: string | null | undefined): string {
  if (!plainOrEmpty || plainOrEmpty.length !== 12) return "************";
  return `${"*".repeat(8)}${plainOrEmpty.slice(-4)}`;
}
