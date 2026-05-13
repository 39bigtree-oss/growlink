import type { FacilityCategory } from "@prisma/client";

import categoryAffinity from "./data/category-affinity.json";
import type { DesireSubScore } from "./types";
import { MAX_DESIRE_SCORE } from "./types";

type CategoryAffinity = {
  favoredJinkaku: number[];
  favoredElements: string[];
  favoredLifePath: number[];
  adjacent: string[];
};
const AFFINITY: Readonly<Record<string, CategoryAffinity>> = categoryAffinity.categories;

const EXACT_COEF = 1.0;
const ADJACENT_COEF = 0.55;
// 希望未入力者を不当に下げないため、未選択時は半分の点を与える。
const UNSPECIFIED_COEF = 0.5;
const NONE_COEF = 0.15;

/**
 * 希望整合度 (0-15)。
 * - 申込者が希望未選択 (空配列) なら中立 (50%) を返す
 * - 対象カテゴリそのものを希望していれば満点
 * - 隣接カテゴリ (category-affinity.adjacent) を希望していれば部分点
 * - いずれでもなければ最低点
 */
export function calculateDesireScore(
  desiredCategories: FacilityCategory[],
  category: FacilityCategory,
): DesireSubScore {
  if (desiredCategories.length === 0) {
    return {
      value: Math.round(MAX_DESIRE_SCORE * UNSPECIFIED_COEF),
      details: { matchType: "none" },
    };
  }
  if (desiredCategories.includes(category)) {
    return {
      value: Math.round(MAX_DESIRE_SCORE * EXACT_COEF),
      details: { matchType: "exact" },
    };
  }
  const adjacent = AFFINITY[category]?.adjacent ?? [];
  const isAdjacent = desiredCategories.some((c) => adjacent.includes(c));
  if (isAdjacent) {
    return {
      value: Math.round(MAX_DESIRE_SCORE * ADJACENT_COEF),
      details: { matchType: "adjacent" },
    };
  }
  return {
    value: Math.round(MAX_DESIRE_SCORE * NONE_COEF),
    details: { matchType: "none" },
  };
}
