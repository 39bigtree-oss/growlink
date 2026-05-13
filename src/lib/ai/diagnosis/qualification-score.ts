import type { FacilityCategory } from "@prisma/client";

import qualificationMatrix from "./data/qualification-matrix.json";
import type { QualificationSubScore } from "./types";
import { MAX_QUALIFICATION_SCORE } from "./types";

type CategoryMatrix = {
  required: string[];
  preferred: string[];
  related: string[];
};
const MATRIX: Readonly<Record<string, CategoryMatrix>> = qualificationMatrix.matrix;

const REQUIRED_WEIGHT = 1.0;
const PREFERRED_WEIGHT = 0.7;
const RELATED_WEIGHT = 0.4;
const NONE_FLOOR = 0.1; // 何も持っていなくても完全 0 にはしない (面接で評価が変わる余地を残す)

/**
 * 業態に対する資格マッチングスコア (0-25)。
 * 申込者の所持資格のうち、業態の required/preferred/related に当てはまった最高係数を採用する。
 * 同点系数の複数所持は加算しないが、related→preferred→required と段階的に上書きされる。
 */
export function calculateQualificationScore(
  qualifications: string[],
  category: FacilityCategory,
): QualificationSubScore {
  const m = MATRIX[category];
  if (!m) {
    return {
      value: Math.round(MAX_QUALIFICATION_SCORE * NONE_FLOOR),
      details: { matched: [], related: [] },
    };
  }

  // 重複入力に強くするため Set 化。
  const owned = new Set(qualifications.map((s) => s.trim()).filter((s) => s.length > 0));

  const matched: string[] = [];
  const related: string[] = [];
  let bestCoef = NONE_FLOOR;

  for (const q of m.required) {
    if (owned.has(q)) {
      matched.push(q);
      bestCoef = Math.max(bestCoef, REQUIRED_WEIGHT);
    }
  }
  for (const q of m.preferred) {
    if (owned.has(q)) {
      matched.push(q);
      bestCoef = Math.max(bestCoef, PREFERRED_WEIGHT);
    }
  }
  for (const q of m.related) {
    if (owned.has(q)) {
      related.push(q);
      bestCoef = Math.max(bestCoef, RELATED_WEIGHT);
    }
  }

  return {
    value: Math.round(MAX_QUALIFICATION_SCORE * bestCoef),
    details: { matched, related },
  };
}
