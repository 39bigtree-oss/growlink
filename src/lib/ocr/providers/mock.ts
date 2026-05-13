import "server-only";

import { createHash } from "node:crypto";

import resumes from "./mock-data/resumes.json";
import type { OcrProvider, OcrResult } from "../types";

type Patterns = {
  patterns: Array<{
    key: string;
    label: string;
    text: string;
    expected: unknown;
  }>;
};
const DATA = resumes as Patterns;

/**
 * 課金回避用のローカル OCR。ファイル内容のハッシュをパターン配列のサイズで mod してテンプレを選ぶ。
 * → 同じファイルなら必ず同じ結果になり、ファイル名 / 中身が変わればパターンも切り替わる。
 *
 * ファイル名に "pattern:<key>" が含まれていれば優先採用。テストや手動再現で便利。
 */
export const mockOcrProvider: OcrProvider = {
  name: "mock",
  async recognize({ bytes, fileName }): Promise<OcrResult> {
    const explicit = fileName ? /pattern:([\w-]+)/.exec(fileName)?.[1] : undefined;
    let chosen = DATA.patterns[0];
    if (explicit) {
      const found = DATA.patterns.find((p) => p.key === explicit);
      if (found) chosen = found;
    } else {
      const h = createHash("sha1").update(bytes).digest();
      const idx = h.readUInt32BE(0) % DATA.patterns.length;
      chosen = DATA.patterns[idx];
    }

    // 念のため遅延をシミュレートしない (テスト高速化のため)。
    return {
      pages: [{ pageIndex: 0, text: chosen.text, confidence: 0.92 }],
      fullText: chosen.text,
      provider: `mock:${chosen.key}`,
    };
  },
};

/** mock パターンに紐付く期待値を返す (テスト用)。 */
export function getMockExpected(providerLabel: string): unknown {
  const key = providerLabel.replace(/^mock:/, "");
  return DATA.patterns.find((p) => p.key === key)?.expected ?? null;
}
