import type { FacilityCategory } from "@prisma/client";

export type Rank = "S" | "A" | "B" | "C" | "D";

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

// 各サブスコアの内訳。Phase 1-5 で Claude にそのまま渡す前提でフラットに置く。
export type ScoreBreakdown = {
  /** 0-30 */
  name: NameSubScore;
  /** 0-30 */
  birth: BirthSubScore;
  /** 0-25 */
  qualification: QualificationSubScore;
  /** 0-15 */
  desire: DesireSubScore;
};

export type NameSubScore = {
  value: number; // 0-30
  // 内部状態は Phase 1-5 の説明文生成に役立つよう breakdown に残す。
  details: {
    strokes: { lastName: number; firstName: number; total: number };
    grids: { tenkaku: number; jinkaku: number; chikaku: number; gaikaku: number; soukaku: number };
    fellOff: boolean; // 漢字テーブルに無い文字が多すぎる場合 true（中立評価にする）
  };
};

export type BirthSubScore = {
  value: number; // 0-30
  details: {
    yearElement: FiveElement;
    lifePath: number; // 1-9 or master 11/22/33
  };
};

export type QualificationSubScore = {
  value: number; // 0-25
  details: {
    matched: string[]; // 業態に紐付いた資格名
    related: string[]; // 関連資格名（部分点）
  };
};

export type DesireSubScore = {
  value: number; // 0-15
  details: {
    matchType: "exact" | "adjacent" | "none";
  };
};

export type ApplicantDiagnosisInput = {
  lastName: string;
  firstName: string;
  birthDate: Date | string;
  qualifications: string[];
  desiredCategories: FacilityCategory[];
};

export type CategoryScore = {
  category: FacilityCategory;
  score: number; // 0-100
  rank: Rank;
  breakdown: ScoreBreakdown;
};

export const MAX_NAME_SCORE = 30;
export const MAX_BIRTH_SCORE = 30;
export const MAX_QUALIFICATION_SCORE = 25;
export const MAX_DESIRE_SCORE = 15;
export const MAX_TOTAL_SCORE = 100;
