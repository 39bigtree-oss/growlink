import type {
  BirthSubScore,
  DesireSubScore,
  NameSubScore,
  QualificationSubScore,
  Rank,
  ScoreBreakdown,
} from "./types";
import {
  MAX_BIRTH_SCORE,
  MAX_DESIRE_SCORE,
  MAX_NAME_SCORE,
  MAX_QUALIFICATION_SCORE,
  MAX_TOTAL_SCORE,
} from "./types";

/**
 * 4 つのサブスコアを合計して 0-100 にする。配点の上限を超えた値が来ても安全に clamp する。
 */
export function aggregateScore(
  name: NameSubScore,
  birth: BirthSubScore,
  qualification: QualificationSubScore,
  desire: DesireSubScore,
): { total: number; breakdown: ScoreBreakdown } {
  const clampedName = Math.max(0, Math.min(MAX_NAME_SCORE, name.value));
  const clampedBirth = Math.max(0, Math.min(MAX_BIRTH_SCORE, birth.value));
  const clampedQual = Math.max(0, Math.min(MAX_QUALIFICATION_SCORE, qualification.value));
  const clampedDesire = Math.max(0, Math.min(MAX_DESIRE_SCORE, desire.value));

  const total = Math.min(
    MAX_TOTAL_SCORE,
    clampedName + clampedBirth + clampedQual + clampedDesire,
  );

  return {
    total,
    breakdown: {
      name: { ...name, value: clampedName },
      birth: { ...birth, value: clampedBirth },
      qualification: { ...qualification, value: clampedQual },
      desire: { ...desire, value: clampedDesire },
    },
  };
}

/**
 * 0-100 のスコアを S/A/B/C/D に変換する。design.md §7.4 に従う:
 *   S: 85-100
 *   A: 70-84
 *   B: 55-69
 *   C: 40-54
 *   D: 0-39
 */
export function toRank(score: number): Rank {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}
