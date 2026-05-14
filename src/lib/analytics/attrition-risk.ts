/**
 * 退職予兆スコア (Attrition Risk Score)。
 *
 * 派遣業 / 紹介業の核 KPI は「入社後 6 ヶ月の生存率」。
 * 早期退職は返金リスクと顧客満足度を毀損するため、Placement ごとに
 * 0〜100 のリスクスコアを返す。100 に近いほど退職リスクが高い。
 *
 * v1.6 はルールベース (経過月 + 雇用形態 + 給与差 + 通勤距離 + 業界経験) の
 * 単純加算モデル。本物の ML (LightGBM 等) は退職実績データが十分溜まってから
 * v2.0 で別サービスとして切り出す予定。
 *
 * 入力 placement は Decimal を含むので number に正規化済みで渡すこと。
 */

export type AttritionRiskInput = {
  /** 入社日 */
  startDate: Date;
  /** 実退職日 (退職済なら指定)。指定があれば「実績」を返す */
  attritionAt: Date | null;
  /** 月給 (税込, 円) */
  monthlyWage: number;
  /** 雇用形態 */
  employmentType: "DISPATCH" | "DIRECT" | "TEMP_TO_PERM" | "PART_TIME";
  /** 業界経験年数 */
  experienceYears: number;
  /** 求職者の希望月給 (任意) — フィット差をリスクに換算 */
  desiredMonthlyWage?: number | null;
  /** 案件の希望シフトと求職者シフトの一致軸数 (0-3) */
  shiftFitAxes?: number | null;
  /** 評価基準日 (default: 今日) */
  now?: Date;
};

export type AttritionRiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AttritionRiskScore = {
  /** 0-100. 100 が最高リスク。退職実績があれば結果に応じて確定値を返す */
  score: number;
  band: AttritionRiskBand;
  /** 入社から何ヶ月経過したか (小数点 1 桁) */
  monthsElapsed: number;
  /** 各要因の寄与 (内訳デバッグ用) */
  contributors: {
    tenureCurve: number;
    employmentType: number;
    wageGap: number;
    shiftMismatch: number;
    experienceLow: number;
    realized: number;
  };
  /** 注釈 (UI 表示用) */
  reasons: string[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function monthsBetween(a: Date, b: Date): number {
  const diff = (b.getTime() - a.getTime()) / MS_PER_DAY;
  return Math.max(0, diff / 30.4375); // 平均月日数
}

function bandOf(score: number): AttritionRiskBand {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function scoreAttritionRisk(input: AttritionRiskInput): AttritionRiskScore {
  const now = input.now ?? new Date();
  const monthsElapsed = monthsBetween(input.startDate, input.attritionAt ?? now);
  const reasons: string[] = [];

  // 実退職済: 早期退職ほどリスクスコアを満点に近づける (返金規定の判断材料)
  if (input.attritionAt) {
    const within = monthsElapsed;
    const realized = within <= 1 ? 100 : within <= 3 ? 90 : within <= 6 ? 75 : within <= 12 ? 50 : 25;
    reasons.push(`退職実績あり (入社から ${within.toFixed(1)} ヶ月)`);
    return {
      score: realized,
      band: bandOf(realized),
      monthsElapsed: Number(within.toFixed(1)),
      contributors: {
        tenureCurve: 0,
        employmentType: 0,
        wageGap: 0,
        shiftMismatch: 0,
        experienceLow: 0,
        realized,
      },
      reasons,
    };
  }

  // 1) 在籍月数カーブ: 派遣業界では 1 ヶ月以内 / 3 ヶ月以内 / 6 ヶ月以内 が要注意
  let tenureCurve = 0;
  if (monthsElapsed < 1) {
    tenureCurve = 35;
    reasons.push("入社 1 ヶ月以内 — 退職ピーク期間");
  } else if (monthsElapsed < 3) {
    tenureCurve = 25;
    reasons.push("入社 3 ヶ月以内 — 退職率が高い期間");
  } else if (monthsElapsed < 6) {
    tenureCurve = 15;
    reasons.push("入社 6 ヶ月以内 — 返金期限と重なる期間");
  } else if (monthsElapsed < 12) {
    tenureCurve = 8;
  } else {
    tenureCurve = 3;
  }

  // 2) 雇用形態リスク (派遣はパート/常勤より退職率高め)
  const employmentRisk: Record<AttritionRiskInput["employmentType"], number> = {
    DISPATCH: 15,
    TEMP_TO_PERM: 10,
    PART_TIME: 8,
    DIRECT: 5,
  };
  const employmentType = employmentRisk[input.employmentType];
  if (input.employmentType === "DISPATCH") {
    reasons.push("派遣形態 — 紹介予定派遣より定着率が低い傾向");
  }

  // 3) 希望給与とのギャップ
  let wageGap = 0;
  if (input.desiredMonthlyWage && input.desiredMonthlyWage > 0) {
    const gap = (input.desiredMonthlyWage - input.monthlyWage) / input.desiredMonthlyWage;
    if (gap > 0.2) {
      wageGap = 20;
      reasons.push(`希望月給より ${Math.round(gap * 100)}% 低い — 待遇不満による退職リスク`);
    } else if (gap > 0.1) {
      wageGap = 10;
      reasons.push(`希望月給より ${Math.round(gap * 100)}% 低い`);
    } else if (gap > 0) {
      wageGap = 5;
    }
  }

  // 4) シフトミスマッチ (一致軸数が 1 以下ならリスク高)
  let shiftMismatch = 0;
  if (input.shiftFitAxes !== null && input.shiftFitAxes !== undefined) {
    if (input.shiftFitAxes <= 1) {
      shiftMismatch = 15;
      reasons.push("希望シフトとのフィット軸が 1 以下");
    } else if (input.shiftFitAxes === 2) {
      shiftMismatch = 7;
    }
  }

  // 5) 業界経験不足
  let experienceLow = 0;
  if (input.experienceYears < 1) {
    experienceLow = 12;
    reasons.push("業界経験 1 年未満 — 環境適応リスク");
  } else if (input.experienceYears < 3) {
    experienceLow = 5;
  }

  const score = Math.min(
    100,
    tenureCurve + employmentType + wageGap + shiftMismatch + experienceLow,
  );

  return {
    score,
    band: bandOf(score),
    monthsElapsed: Number(monthsElapsed.toFixed(1)),
    contributors: {
      tenureCurve,
      employmentType,
      wageGap,
      shiftMismatch,
      experienceLow,
      realized: 0,
    },
    reasons,
  };
}

export const BAND_LABEL: Record<AttritionRiskBand, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "非常に高い",
};

export const BAND_VARIANT: Record<AttritionRiskBand, "outline" | "secondary" | "warning" | "danger"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "warning",
  CRITICAL: "danger",
};
