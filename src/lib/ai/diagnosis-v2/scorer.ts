import type { FacilityCategory } from "@prisma/client";

import { CARE_TYPES, codeFromScores, getCareType, type CareType, type TraitScores, type TypeCode } from "./types";

/**
 * v2.0 ケアタイプ診断のスコアリング・ロジック。
 *
 * AI プロバイダ (Gemini / Claude) と組み合わせる前段に、決定論的な
 * ベーススコアを計算する。AI 接続前 (mock) でもそれっぽい結果を出すため。
 *
 * 入力:
 *   - 申込者の保有資格 (Qualification[])
 *   - 希望業態 (FacilityCategory[])
 *   - 経験年数 (skillSheet から取得した値)
 *   - 性別・年齢 (補助)
 *
 * 出力:
 *   - 8 軸スコア (TraitScores)
 *   - 4 文字コード (TypeCode)
 *   - 4 大エンジン (パワー / 基礎 / 実務 / 頭脳) のスコア
 *   - 希望業態への適性 + 隠れた適性 1〜2 個
 *   - 強み TOP 3 と気をつけたいポイント
 */

export type DiagnosisInput = {
  applicantId: string;
  qualifications: string[];
  desiredCategories: FacilityCategory[];
  experienceYears: number;
  /** 0-100 の補助シード (氏名や生年月日のハッシュなど)。決定論的にバリエーションを出す */
  variantSeed?: number;
};

export type EngineScores = {
  totalPower: { rank: Rank; score: number; comment: string };
  foundation: { rank: Rank; score: number; comment: string };
  execution: { rank: Rank; score: number; comment: string };
  intellect: { rank: Rank; score: number; comment: string };
};

export type Rank = "S" | "A" | "B" | "C" | "D";

export type CategoryFit = {
  category: FacilityCategory;
  score: number;
  rank: Rank;
  comment: string;
  /** ユーザーの希望業態に含まれているか */
  isDesired: boolean;
};

export type DiagnosisV2Result = {
  typeCode: TypeCode;
  type: CareType;
  traits: TraitScores;
  engines: EngineScores;
  /** 希望業態のみの評価 */
  desiredFit: CategoryFit[];
  /** 希望外で「意外と合うかも」の業態 1〜2 個 */
  hiddenFit: CategoryFit[];
  strengths: string[];
  watchPoints: string[];
  partners: { code: TypeCode; name: string }[];
  summary: string;
};

function rankFromScore(score: number): Rank {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  return "D";
}

/** 業態カテゴリ × 4 文字コードの相性表 (経験則ベース、後で実データで更新可能) */
const CATEGORY_AFFINITY: Record<FacilityCategory, { axis: keyof TraitScores; weight: number }[]> = {
  HOSPITAL_ACUTE: [
    { axis: "energetic", weight: 0.4 },
    { axis: "team", weight: 0.3 },
    { axis: "stable", weight: 0.2 },
  ],
  HOSPITAL_GENERAL: [
    { axis: "team", weight: 0.35 },
    { axis: "stable", weight: 0.3 },
    { axis: "energetic", weight: 0.2 },
  ],
  CLINIC: [
    { axis: "team", weight: 0.3 },
    { axis: "caring", weight: 0.3 },
    { axis: "stable", weight: 0.25 },
  ],
  DAYCARE_ELDERLY: [
    { axis: "caring", weight: 0.4 },
    { axis: "team", weight: 0.3 },
    { axis: "stable", weight: 0.2 },
  ],
  REHAB_DAY: [
    { axis: "caring", weight: 0.35 },
    { axis: "team", weight: 0.3 },
    { axis: "energetic", weight: 0.2 },
  ],
  HOMEVISIT_NURSE: [
    { axis: "caring", weight: 0.35 },
    // 単独行動が多いので team=低 = 単独志向の人ほど高評価
    { axis: "team", weight: -0.2 },
    { axis: "stable", weight: 0.3 },
  ],
  HOMEVISIT_NURSE_PSYCHIATRY: [
    { axis: "caring", weight: 0.45 },
    { axis: "team", weight: -0.15 }, // 単独志向で評価アップ
    { axis: "stable", weight: 0.25 },
  ],
  HOMEVISIT_CARE: [
    { axis: "caring", weight: 0.4 },
    { axis: "team", weight: -0.2 },
    { axis: "stable", weight: 0.2 },
  ],
  DAYCARE_DISABILITY: [
    { axis: "caring", weight: 0.45 },
    { axis: "team", weight: 0.2 },
  ],
  HOMEVISIT_DISABILITY: [
    { axis: "caring", weight: 0.45 },
    { axis: "team", weight: -0.2 },
  ],
  GROUP_HOME_DISABILITY: [
    { axis: "caring", weight: 0.4 },
    { axis: "team", weight: 0.25 },
    { axis: "stable", weight: 0.25 },
  ],
};

const CATEGORY_LABEL: Record<FacilityCategory, string> = {
  HOSPITAL_ACUTE: "急性期病院",
  HOSPITAL_GENERAL: "総合病院",
  CLINIC: "外来クリニック",
  DAYCARE_ELDERLY: "デイサービス",
  REHAB_DAY: "通所リハビリ",
  HOMEVISIT_NURSE: "訪問看護",
  HOMEVISIT_NURSE_PSYCHIATRY: "訪問看護(精神科)",
  HOMEVISIT_CARE: "訪問介護",
  DAYCARE_DISABILITY: "障害者デイ",
  HOMEVISIT_DISABILITY: "障害者訪問介護",
  GROUP_HOME_DISABILITY: "グループホーム(障害)",
};

/**
 * 申込情報から決定論的にスコア計算する (mock/AI 接続前用)。
 * AI 接続時は別途 LLM が同 schema を埋める。
 */
export function computeBaseDiagnosis(input: DiagnosisInput): DiagnosisV2Result {
  const seed = input.variantSeed ?? hashSeed(input.applicantId);
  const r = pseudoRandom(seed);

  // 1) 8 軸スコアを計算
  // 資格・経験・希望業態から軸を傾ける
  // v2.0.3: 全体的にスコアを底上げ (求職者が「自分のことを認めてくれてる」と感じる水準に)
  const has = (q: string) => input.qualifications.some((x) => x.includes(q));
  const caringBase = 68 + (has("介護福祉士") ? 10 : 0) + (has("認知症ケア") ? 8 : 0) + (has("看護師") ? 6 : 0);
  const energeticBase = 64 + Math.min(input.experienceYears * 1.5, 20) + (has("救急") ? 10 : 0);
  const teamBase = 66 + (input.desiredCategories.some((c) => c.startsWith("HOSPITAL")) ? 8 : 0);
  const stableBase = 65 + Math.min(input.experienceYears * 1.2, 22);

  const traits: TraitScores = {
    caring: Math.floor(clamp(caringBase + (r.next() - 0.5) * 16, 50, 96)),
    energetic: Math.floor(clamp(energeticBase + (r.next() - 0.5) * 16, 50, 96)),
    team: Math.floor(clamp(teamBase + (r.next() - 0.5) * 16, 50, 96)),
    stable: Math.floor(clamp(stableBase + (r.next() - 0.5) * 16, 50, 96)),
  };

  const typeCode = codeFromScores(traits);
  const type = getCareType(typeCode);

  // 2) 4 大エンジン (Big Five の主成分にマップ) — v2.0.3 底上げ
  const engines: EngineScores = {
    totalPower: makeEngine(
      Math.round((traits.energetic + traits.team + traits.stable + traits.caring) / 4) + 8,
      "業務全般を高水準でこなす総合力",
    ),
    foundation: makeEngine(
      Math.round((traits.stable + traits.caring) / 2) + 10,
      "誠実さと継続力で土台を支える力",
    ),
    execution: makeEngine(
      Math.round((traits.energetic + traits.stable) / 2) + 8,
      "現場での実務遂行と判断スピード",
    ),
    intellect: makeEngine(
      Math.round((traits.caring + traits.team) / 2) + 6,
      "観察と分析で本質を捉える知性",
    ),
  };

  // 3) 業態フィット計算
  const allCategories = Object.keys(CATEGORY_AFFINITY) as FacilityCategory[];
  const fits: CategoryFit[] = allCategories.map((cat) => {
    const aff = CATEGORY_AFFINITY[cat];
    let score = 50;
    for (const a of aff) {
      const tv = traits[a.axis];
      const centered = tv - 50;
      score += centered * a.weight * 0.5;
    }
    score = clamp(score, 25, 98);
    return {
      category: cat,
      score: Math.round(score),
      rank: rankFromScore(score),
      comment: makeCategoryComment(cat, score, type),
      isDesired: input.desiredCategories.includes(cat),
    };
  });

  const desiredFit = fits
    .filter((f) => f.isDesired)
    .sort((a, b) => b.score - a.score);

  // 隠れた適性 = 希望外で score 上位 2 つ、ただし希望のトップより低くないものを優先
  const desiredTop = desiredFit[0]?.score ?? 0;
  const hiddenFit = fits
    .filter((f) => !f.isDesired && f.score >= Math.max(70, desiredTop - 10))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return {
    typeCode,
    type,
    traits,
    engines,
    desiredFit,
    hiddenFit,
    strengths: type.strengthThemes,
    watchPoints: type.watchPoints,
    partners: type.partners.map((code) => ({
      code,
      name: CARE_TYPES[code]?.name ?? code,
    })),
    summary: buildSummary(type, traits),
  };
}

/**
 * 4 大エンジンの「コメント」は **良いところ・理由**を 1 文で書く。
 * v2.0.3 で「説明」から「ポジティブな根拠」に書き換え。
 */
function makeEngine(rawScore: number, theme: string) {
  const score = Math.floor(clamp(rawScore + 5, 55, 98));
  const rank = rankFromScore(score);
  let positive: string;
  if (score >= 85) {
    positive = `${theme}が極めて高水準。現場の中核として頼られる素質があります。`;
  } else if (score >= 75) {
    positive = `${theme}に高い適性。安心して任せられる場面が多いはずです。`;
  } else if (score >= 65) {
    positive = `${theme}を着実に発揮できるタイプ。経験と共にさらに伸ばせます。`;
  } else {
    positive = `${theme}は伸びしろがある領域。OJT で順調に育つでしょう。`;
  }
  return { rank, score, comment: positive };
}

/**
 * 業態別コメント — **向いている理由** + **気をつける点**を併記。
 * v2.0.3 で「環境とのマッチを慎重に」のような曖昧表現を撤廃。
 */
function makeCategoryComment(cat: FacilityCategory, score: number, type: CareType): string {
  const label = CATEGORY_LABEL[cat];
  if (score >= 85) {
    return `${label}: ${type.name}の強みが最大限に活きる現場。早期に主力として活躍が期待できます。`;
  }
  if (score >= 75) {
    return `${label}: 高い相性。${type.catchphrase}という性質が現場文化と合致しやすい業態です。`;
  }
  if (score >= 65) {
    return `${label}: 良好な相性。研修期間に少し時間をかければ十分に力を発揮できます。`;
  }
  if (score >= 55) {
    return `${label}: 一定の適性あり。本人の伸びしろを活かす配属を検討する価値あり。`;
  }
  return `${label}: 業務スタイルが少し離れる業態。本人の希望と現場理解を確認した上で検討を。`;
}

function buildSummary(type: CareType, traits: TraitScores): string {
  const lines: string[] = [];
  lines.push(`「${type.catchphrase}」を体現するタイプとされています。`);
  if (traits.caring >= 70) lines.push("人との関係性で力を発揮し、信頼を積み上げやすい一方、");
  if (traits.stable >= 70) lines.push("継続的な業務にも安定して取り組めます。");
  if (traits.energetic >= 70) lines.push("行動の速さで現場を引っ張る場面でも活躍が期待されます。");
  if (traits.team < 50) lines.push("単独行動でも力を発揮できるため、訪問系の業務にも適性があります。");
  lines.push("本人面談では、業務量・チーム体制・夜勤可否などを確認するのがおすすめです。");
  return lines.join("");
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pseudoRandom(seed: number) {
  let state = seed || 1;
  return {
    next: () => {
      // xorshift32
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return ((state >>> 0) % 100000) / 100000;
    },
  };
}

export { CATEGORY_LABEL };
