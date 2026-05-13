import type { Applicant, Diagnosis } from "@prisma/client";

import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";

import type { DiagnosisPdfInput, DiagnosisPdfRow } from "./diagnosisPdf";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

const ORG = {
  name: "株式会社グロウリンク",
  contact: "https://growlink.example / info@growlink.example",
};

export function buildDiagnosisPdfInput(
  applicant: Pick<Applicant, "lastName" | "firstName">,
  diagnoses: Diagnosis[],
  overview: string,
  generatedAt: Date = new Date(),
): DiagnosisPdfInput {
  const rows: DiagnosisPdfRow[] = [...diagnoses]
    .sort((a, b) => b.score - a.score) // スコア降順で出力
    .map((d) => ({
      category: d.category,
      categoryLabel: CATEGORY_LABELS[d.category] ?? d.category,
      score: d.score,
      rank: d.rank,
      proComment: d.proComment,
      conComment: d.conComment,
    }));

  return {
    applicantFullName: `${applicant.lastName} ${applicant.firstName}`,
    generatedAt,
    overview,
    rows,
    organization: ORG,
  };
}

/**
 * 上位スコアと内訳から、PDF 冒頭の総合所見 (2-3 行) を組み立てる。
 * Phase 1-5 では決定論的に最上位カテゴリの説明文を返す簡素実装にしておき、
 * Phase 1-6 以降で Claude による所見生成に差し替える余地を残す。
 */
export function buildOverviewText(diagnoses: Diagnosis[]): string {
  if (diagnoses.length === 0) return "診断結果はまだ作成されていません。";
  const sorted = [...diagnoses].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const topLabel = CATEGORY_LABELS[top.category] ?? top.category;
  const second = sorted[1];
  const secondLabel = second ? CATEGORY_LABELS[second.category] ?? second.category : "";
  const head = `総合的なご経歴とご希望から、特に「${topLabel}」での適性 (ランク ${top.rank}) が高く出ています。`;
  const tail = second
    ? `続いて「${secondLabel}」(ランク ${second.rank}) も視野に入る結果でした。`
    : "";
  return `${head} ${tail}`.trim();
}
