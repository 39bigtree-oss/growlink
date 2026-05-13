import answers from "./mock-data/answers.json";
import type { SttProvider, SttResult } from "../types";

type Bank = Record<string, string[][]>;
const DATA = answers as unknown as Bank;
const SUPPORTED = new Set(["ja", "en", "vi", "id", "zh"]);

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 課金回避用の Whisper 代替。質問インデックスごとに 3 種の答え案を持ち、seed (Interview.id) でハッシュ選択。
 * - hint.turnIndex 未指定なら 0 番扱い (汎用回答)
 * - 未対応言語は ja にフォールバック
 */
export const mockSttProvider: SttProvider = {
  name: "mock",
  async transcribe({ language, hint }): Promise<SttResult> {
    const lang = language && SUPPORTED.has(language) ? language : "ja";
    const bank = DATA[lang] ?? DATA.ja;
    const turnIndex = Math.max(0, Math.min(bank.length - 1, hint?.turnIndex ?? 0));
    const variants = bank[turnIndex] ?? [""];
    const seed = `${hint?.seed ?? ""}|${turnIndex}`;
    const text = variants[hash(seed) % variants.length] ?? "";
    return { text, language: lang, provider: "mock" };
  },
};
