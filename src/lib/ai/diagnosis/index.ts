import { FacilityCategory } from "@prisma/client";

import { aggregateScore, toRank } from "./aggregate";
import { calculateBirthScore } from "./birth-score";
import { calculateDesireScore } from "./desire-score";
import { calculateNameScore } from "./name-score";
import { calculateQualificationScore } from "./qualification-score";
import type { ApplicantDiagnosisInput, CategoryScore } from "./types";

// 一覧の安定順序を担保するため、列挙順を明示しておく。Prisma の enum 列挙順とは独立に管理する。
export const ALL_CATEGORIES: readonly FacilityCategory[] = [
  "HOSPITAL_ACUTE",
  "HOSPITAL_GENERAL",
  "CLINIC",
  "DAYCARE_ELDERLY",
  "REHAB_DAY",
  "HOMEVISIT_NURSE",
  "HOMEVISIT_NURSE_PSYCHIATRY",
  "HOMEVISIT_CARE",
  "DAYCARE_DISABILITY",
  "HOMEVISIT_DISABILITY",
  "GROUP_HOME_DISABILITY",
] as const;

/**
 * 全業態に対する Phase 1-4 決定論スコアを返す。Phase 1-5 ではこの配列を Claude に渡し、
 * proComment / conComment を生成して付与する。
 */
export function buildAllCategoriesScores(
  applicant: ApplicantDiagnosisInput,
  gender: "MALE" | "FEMALE" | "OTHER" = "OTHER",
): CategoryScore[] {
  return ALL_CATEGORIES.map((category) => buildCategoryScore(applicant, gender, category));
}

export function buildCategoryScore(
  applicant: ApplicantDiagnosisInput,
  gender: "MALE" | "FEMALE" | "OTHER",
  category: FacilityCategory,
): CategoryScore {
  const name = calculateNameScore(applicant.lastName, applicant.firstName, category);
  const birth = calculateBirthScore(applicant.birthDate, gender, category);
  const qualification = calculateQualificationScore(applicant.qualifications, category);
  const desire = calculateDesireScore(applicant.desiredCategories, category);

  const { total, breakdown } = aggregateScore(name, birth, qualification, desire);
  return {
    category,
    score: total,
    rank: toRank(total),
    breakdown,
  };
}

export { aggregateScore, toRank } from "./aggregate";
export { calculateBirthScore, yearElement, lifePathNumber } from "./birth-score";
export { calculateDesireScore } from "./desire-score";
export { calculateNameScore, computeGrids } from "./name-score";
export { calculateQualificationScore } from "./qualification-score";
export { strokesOf, totalStrokes, kanjiRatio, isKanaOnly } from "./strokes";
export type {
  ApplicantDiagnosisInput,
  BirthSubScore,
  CategoryScore,
  DesireSubScore,
  FiveElement,
  NameSubScore,
  QualificationSubScore,
  Rank,
  ScoreBreakdown,
} from "./types";
