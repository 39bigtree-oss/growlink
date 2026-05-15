/**
 * 日本語のカナをローマ字に変換する簡易ヘルパ。
 * 完璧なヘボン式実装ではないが、姓名のイニシャル化には十分。
 *
 * 例: "ハセガワ" "ナオキ" → "H.N." 形式
 *
 * 漢字のみの名前は対応不可なので、kana を必ず渡すこと。
 */

const KANA_TO_ROMAN: Record<string, string> = {
  ア: "A", イ: "I", ウ: "U", エ: "E", オ: "O",
  カ: "K", キ: "K", ク: "K", ケ: "K", コ: "K",
  サ: "S", シ: "S", ス: "S", セ: "S", ソ: "S",
  タ: "T", チ: "C", ツ: "T", テ: "T", ト: "T",
  ナ: "N", ニ: "N", ヌ: "N", ネ: "N", ノ: "N",
  ハ: "H", ヒ: "H", フ: "F", ヘ: "H", ホ: "H",
  マ: "M", ミ: "M", ム: "M", メ: "M", モ: "M",
  ヤ: "Y", ユ: "Y", ヨ: "Y",
  ラ: "R", リ: "R", ル: "R", レ: "R", ロ: "R",
  ワ: "W", ヲ: "O", ン: "N",
  ガ: "G", ギ: "G", グ: "G", ゲ: "G", ゴ: "G",
  ザ: "Z", ジ: "J", ズ: "Z", ゼ: "Z", ゾ: "Z",
  ダ: "D", ヂ: "J", ヅ: "Z", デ: "D", ド: "D",
  バ: "B", ビ: "B", ブ: "B", ベ: "B", ボ: "B",
  パ: "P", ピ: "P", プ: "P", ペ: "P", ポ: "P",
};

/** ひらがなをカタカナに変換 */
function hiraToKata(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (m) =>
    String.fromCharCode(m.charCodeAt(0) + 0x60),
  );
}

/** カナの最初の文字をローマ字 1 文字 (大文字) に */
export function firstKanaToRoman(kana: string | null | undefined): string {
  if (!kana) return "?";
  const kata = hiraToKata(kana.trim());
  const first = kata[0];
  if (!first) return "?";
  return KANA_TO_ROMAN[first] ?? first;
}

/**
 * 姓名のカナから "H.N." 形式のイニシャルを作る。
 * 例: lastNameKana = "ハセガワ" / firstNameKana = "ナオキ" → "H.N."
 */
export function initialsFromKana(lastNameKana: string | null | undefined, firstNameKana: string | null | undefined): string {
  return `${firstKanaToRoman(lastNameKana)}.${firstKanaToRoman(firstNameKana)}.`;
}
