import kanjiStrokes from "./data/kanji-strokes.json";

const STROKES: Readonly<Record<string, number>> = kanjiStrokes.strokes;
const DEFAULT_STROKES: number = kanjiStrokes._default;

const CJK_UNIFIED = /[一-鿿]/;
const HIRAGANA = /[぀-ゟ]/;
const KATAKANA = /[゠-ヿ]/;

/**
 * 文字の画数を返す。テーブルにない漢字は default 値、それ以外（ひらがな・カタカナ・英数）は文字単位 1 として扱う。
 */
export function strokesOf(ch: string): number {
  if (!ch) return 0;
  if (Object.prototype.hasOwnProperty.call(STROKES, ch)) {
    return STROKES[ch];
  }
  if (CJK_UNIFIED.test(ch)) {
    return DEFAULT_STROKES;
  }
  // ひらがな・カタカナ・英字・スペース・記号は 1 とする。
  return 1;
}

/** 文字列全体の画数和。空白は除外。 */
export function totalStrokes(str: string): number {
  let sum = 0;
  for (const ch of str.trim()) {
    if (ch === " " || ch === "　") continue;
    sum += strokesOf(ch);
  }
  return sum;
}

/** 文字列中、漢字 (CJK 統合漢字) の比率。0-1。空文字なら 0。 */
export function kanjiRatio(str: string): number {
  const trimmed = str.trim();
  if (trimmed.length === 0) return 0;
  let kanji = 0;
  let total = 0;
  for (const ch of trimmed) {
    if (ch === " " || ch === "　") continue;
    total += 1;
    if (CJK_UNIFIED.test(ch)) kanji += 1;
  }
  if (total === 0) return 0;
  return kanji / total;
}

/** 文字列が日本語仮名のみで構成されているか。 */
export function isKanaOnly(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;
  for (const ch of trimmed) {
    if (ch === " " || ch === "　") continue;
    if (!(HIRAGANA.test(ch) || KATAKANA.test(ch))) return false;
  }
  return true;
}
