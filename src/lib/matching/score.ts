import type { ApplicantMatchingProfile, ShiftPattern } from "@/lib/schemas/job-order";

/**
 * 加重マッチングスコア (求職者 × 求人案件)。
 *
 * 重み配分:
 *   distance 20% / wage 25% / shift 20% / qual 25% / exp 10%
 *
 * 必須資格 (requiredQualifications) を全て保持していない場合は **total = 0** で
 * ハードフィルタする。要件を満たさない応募者を上位に出さないため。
 *
 * 距離スコアは MVP として「都道府県/市区町村の一致度」のみ。
 * 緯度経度 + Haversine 距離は v1.5 で実装予定。
 */

export type JobOrderForMatching = {
  facility: { prefecture: string; city: string };
  position: string;
  employmentType: string;
  hourlyWageMin: number | null;
  hourlyWageMax: number | null;
  monthlyWageMin: number | null;
  monthlyWageMax: number | null;
  shiftPattern: ShiftPattern | null;
  requiredQualifications: string[];
  preferredQualifications: string[];
  minExperienceYears: number;
};

export type MatchScore = {
  total: number;
  breakdown: {
    distance: number;
    wage: number;
    shift: number;
    qual: number;
    exp: number;
  };
  reasoning: string[];
  hardFiltered: boolean;
};

const WEIGHTS = {
  distance: 0.2,
  wage: 0.25,
  shift: 0.2,
  qual: 0.25,
  exp: 0.1,
} as const;

export function scoreMatch(
  applicant: ApplicantMatchingProfile,
  jobOrder: JobOrderForMatching,
): MatchScore {
  const reasoning: string[] = [];

  // 1) 必須資格ハードフィルタ
  const missingRequired = jobOrder.requiredQualifications.filter(
    (q) => !applicant.qualifications.includes(q),
  );
  if (missingRequired.length > 0) {
    return {
      total: 0,
      breakdown: { distance: 0, wage: 0, shift: 0, qual: 0, exp: 0 },
      reasoning: [`必須資格未保持: ${missingRequired.join(", ")} → 候補から除外`],
      hardFiltered: true,
    };
  }

  // 2) 距離スコア (都道府県/市区町村の一致度)
  let distance = 0;
  if (applicant.prefecture && jobOrder.facility.prefecture === applicant.prefecture) {
    distance += 60;
    reasoning.push(`同一都道府県 (${applicant.prefecture})`);
    if (applicant.city && jobOrder.facility.city === applicant.city) {
      distance += 40;
      reasoning.push(`同一市区町村 (${applicant.city})`);
    } else {
      distance += 15;
    }
  } else if (applicant.prefecture) {
    distance = 20;
    reasoning.push(`都道府県外 (${applicant.prefecture} → ${jobOrder.facility.prefecture})`);
  } else {
    distance = 50;
  }

  // 3) 時給/月給フィット
  let wage = 50;
  if (applicant.desiredHourlyWage && jobOrder.hourlyWageMax) {
    if (jobOrder.hourlyWageMax >= applicant.desiredHourlyWage) {
      wage = 100;
      reasoning.push(`希望時給 ${applicant.desiredHourlyWage} 円 ≤ 上限 ${jobOrder.hourlyWageMax} 円`);
    } else {
      const ratio = jobOrder.hourlyWageMax / applicant.desiredHourlyWage;
      wage = Math.max(20, Math.round(ratio * 80));
      reasoning.push(`希望時給に対し上限が ${Math.round(ratio * 100)}%`);
    }
  } else if (applicant.desiredMonthlyWage && jobOrder.monthlyWageMax) {
    if (jobOrder.monthlyWageMax >= applicant.desiredMonthlyWage) {
      wage = 100;
      reasoning.push(`希望月給 ${applicant.desiredMonthlyWage} 円 ≤ 上限 ${jobOrder.monthlyWageMax} 円`);
    } else {
      const ratio = jobOrder.monthlyWageMax / applicant.desiredMonthlyWage;
      wage = Math.max(20, Math.round(ratio * 80));
      reasoning.push(`希望月給に対し上限が ${Math.round(ratio * 100)}%`);
    }
  }

  // 4) シフトフィット
  let shift = 70;
  if (applicant.shiftPreference && jobOrder.shiftPattern) {
    const a = applicant.shiftPreference;
    const j = jobOrder.shiftPattern;
    let hits = 0;
    let total = 0;
    for (const key of ["dayShift", "nightShift", "oncall"] as const) {
      total++;
      if (a[key] === j[key]) hits++;
    }
    shift = Math.round((hits / total) * 100);
    reasoning.push(`シフト一致 ${hits}/${total} 軸`);
  }

  // 5) 必須資格 + 推奨資格のスコア
  const requiredMet = jobOrder.requiredQualifications.length === 0 ? 100 : 100;
  const preferredHits = jobOrder.preferredQualifications.filter((q) =>
    applicant.qualifications.includes(q),
  ).length;
  const preferredBonus =
    jobOrder.preferredQualifications.length === 0
      ? 0
      : Math.round((preferredHits / jobOrder.preferredQualifications.length) * 40);
  const qual = Math.min(100, Math.round(requiredMet * 0.6 + preferredBonus));
  if (preferredHits > 0) {
    reasoning.push(`推奨資格 ${preferredHits}/${jobOrder.preferredQualifications.length} 件保持`);
  }

  // 6) 経験年数
  let exp = 50;
  if (jobOrder.minExperienceYears > 0) {
    if (applicant.experienceYears >= jobOrder.minExperienceYears) {
      const bonus = Math.min(50, (applicant.experienceYears - jobOrder.minExperienceYears) * 5);
      exp = 50 + bonus;
      reasoning.push(
        `経験 ${applicant.experienceYears} 年 ≥ 必要 ${jobOrder.minExperienceYears} 年`,
      );
    } else {
      const ratio = applicant.experienceYears / jobOrder.minExperienceYears;
      exp = Math.max(10, Math.round(ratio * 50));
      reasoning.push(`経験不足 (${applicant.experienceYears}/${jobOrder.minExperienceYears} 年)`);
    }
  } else {
    exp = applicant.experienceYears > 0 ? Math.min(100, 60 + applicant.experienceYears * 2) : 50;
  }

  const total = Math.round(
    distance * WEIGHTS.distance +
      wage * WEIGHTS.wage +
      shift * WEIGHTS.shift +
      qual * WEIGHTS.qual +
      exp * WEIGHTS.exp,
  );

  return {
    total,
    breakdown: { distance, wage, shift, qual, exp },
    reasoning,
    hardFiltered: false,
  };
}
