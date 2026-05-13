import type { FacilityCategory } from "@prisma/client";

import categoryAffinity from "./data/category-affinity.json";
import { isKanaOnly, kanjiRatio, strokesOf, totalStrokes } from "./strokes";
import type { NameSubScore } from "./types";
import { MAX_NAME_SCORE } from "./types";

type CategoryAffinity = {
  favoredJinkaku: number[];
  favoredElements: string[];
  favoredLifePath: number[];
  adjacent: string[];
};
const AFFINITY: Readonly<Record<string, CategoryAffinity>> = categoryAffinity.categories;

const KANJI_RATIO_THRESHOLD = 0.5;

/** 1-81 の数を 1-81 の範囲に折り畳む（81 を超えたら 80 で割った余り + 1）。 */
function fold81(n: number): number {
  if (n <= 0) return 0;
  if (n <= 81) return n;
  return ((n - 1) % 80) + 1;
}

/** 姓名から五格を計算。漢字以外（カナ・空文字）はそれぞれ 1 で数える。 */
export function computeGrids(lastName: string, firstName: string) {
  const lnStrokes = totalStrokes(lastName);
  const fnStrokes = totalStrokes(firstName);
  const lastChars = [...lastName.trim()];
  const firstChars = [...firstName.trim()];

  const lastTail = lastChars.length > 0 ? strokesOf(lastChars[lastChars.length - 1]) : 0;
  const firstHead = firstChars.length > 0 ? strokesOf(firstChars[0]) : 0;
  // 1 字姓・1 字名でも破綻しないように、霊数 +1 を補う伝統に倣う。
  const lastTailAdj = lastChars.length <= 1 ? lastTail + 1 : lastTail;
  const firstHeadAdj = firstChars.length <= 1 ? firstHead + 1 : firstHead;

  const tenkaku = fold81(lnStrokes); // 天格: 姓の画数和
  const chikaku = fold81(fnStrokes); // 地格: 名の画数和
  const jinkaku = fold81(lastTailAdj + firstHeadAdj); // 人格: 姓末字 + 名頭字
  const soukaku = fold81(lnStrokes + fnStrokes); // 総格: 全画数
  const gaikaku = fold81(Math.max(0, soukaku - jinkaku)); // 外格: 総格 - 人格

  return { tenkaku, jinkaku, chikaku, gaikaku, soukaku };
}

const LUCKY_GRID_NUMBERS = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47,
  48, 52, 57, 58, 61, 63, 65, 67, 68, 81,
]);

function gridLuckBonus(n: number): number {
  return LUCKY_GRID_NUMBERS.has(n) ? 1 : 0;
}

function affinityWithCategory(jinkaku: number, soukaku: number, category: FacilityCategory): number {
  const a = AFFINITY[category];
  if (!a) return 0.5;

  // 人格が嗜好リストに含まれていれば 1.0 (完全一致)、近傍 (±1) なら 0.7、それ以外 0.35。
  let jinkakuScore = 0.35;
  if (a.favoredJinkaku.includes(jinkaku)) {
    jinkakuScore = 1.0;
  } else if (a.favoredJinkaku.some((v) => Math.abs(v - jinkaku) === 1)) {
    jinkakuScore = 0.7;
  }

  // 総格が吉数なら +0.15 補正。
  const soukakuBonus = LUCKY_GRID_NUMBERS.has(soukaku) ? 0.15 : 0;

  return Math.min(1, jinkakuScore + soukakuBonus);
}

/**
 * 姓名判断スコア (0-30) を業態カテゴリに対して計算する。
 *
 * - 漢字比率が低い (KANJI_RATIO_THRESHOLD 未満) 名前は中立値 (15) を返す。
 *   ローマ字・カナ名で 姓名判断 のルールを当てるのは不公平なため。
 * - 五格を計算し、人格・総格を基に各カテゴリの嗜好テーブルとの相性を取る。
 * - 吉数 (LUCKY_GRID_NUMBERS) は補正で加算される。
 */
export function calculateNameScore(
  lastName: string,
  firstName: string,
  category: FacilityCategory,
): NameSubScore {
  const fullName = `${lastName}${firstName}`;
  const grids = computeGrids(lastName, firstName);
  const strokes = {
    lastName: totalStrokes(lastName),
    firstName: totalStrokes(firstName),
    total: totalStrokes(lastName) + totalStrokes(firstName),
  };

  const ratio = kanjiRatio(fullName);
  const fellOff = ratio < KANJI_RATIO_THRESHOLD && !isKanaOnly(fullName);
  if (ratio < KANJI_RATIO_THRESHOLD) {
    // 漢字主体でない名前 (ローマ字 / 仮名のみ等) は中立値を返す。
    return {
      value: Math.round(MAX_NAME_SCORE / 2),
      details: { strokes, grids, fellOff },
    };
  }

  const affinity = affinityWithCategory(grids.jinkaku, grids.soukaku, category);
  const luckBoost = gridLuckBonus(grids.tenkaku) * 0.5 + gridLuckBonus(grids.chikaku) * 0.5;
  const normalized = Math.min(1, affinity * 0.85 + luckBoost * 0.075);

  return {
    value: Math.round(MAX_NAME_SCORE * normalized),
    details: { strokes, grids, fellOff: false },
  };
}
