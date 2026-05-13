import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { Diagnosis, Facility, FacilityCategory } from "@prisma/client";

import { complete } from "@/lib/ai/client";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import type { MaskedApplicantForFax } from "@/lib/mask";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export type FaxCoverBody = {
  greeting: string;
  headline: string;
  summary: string;
  callToAction: string;
};

export type FaxDetailBody = {
  interviewSummary: string;
  careerHighlights: string[];
  strengths: string[];
  commuteAreaNote: string;
  startAvailability: string;
  introTermsNote: string;
};

export type FaxBody = {
  cover: FaxCoverBody;
  detail: FaxDetailBody;
  provider: string;
};

export type BuildFaxBodyInput = {
  applicant: MaskedApplicantForFax;
  facility: Pick<Facility, "name" | "category" | "prefecture" | "city">;
  /** その施設カテゴリ向けの診断結果 (なければ undefined) */
  diagnosisForCategory?: Pick<Diagnosis, "category" | "rank" | "score"> | null;
  /** 希望条件抜粋 */
  desired?: { schedule?: string; startMonth?: string };
  /** 通勤エリア説明 */
  commuteArea?: string;
  /** AI 面接サマリ (Phase 3 まで null) */
  interviewSummary?: string | null;
};

const COVER_PROMPT_PATH = path.join(process.cwd(), "src/prompts/fax.cover.md");
const DETAIL_PROMPT_PATH = path.join(process.cwd(), "src/prompts/fax.detail.md");

let cachedCover: string | null = null;
let cachedDetail: string | null = null;

async function loadPrompts(): Promise<{ cover: string; detail: string }> {
  if (!cachedCover) cachedCover = await fs.readFile(COVER_PROMPT_PATH, "utf8");
  if (!cachedDetail) cachedDetail = await fs.readFile(DETAIL_PROMPT_PATH, "utf8");
  return { cover: cachedCover, detail: cachedDetail };
}

function categoryLabelFor(category: FacilityCategory): string {
  return CATEGORY_LABEL[category] ?? category;
}

/**
 * cover / detail 2 セットを生成。AI_PROVIDER=mock のときは決定論的テンプレを返す。
 * 失敗時は最低限のフォールバックを埋め込む (FaxSheet は必ず生成される)。
 */
export async function buildFaxBody(input: BuildFaxBodyInput): Promise<FaxBody> {
  const { cover, detail } = await loadPrompts();
  const payload = {
    applicant: {
      initials: input.applicant.initials,
      genderLabel: input.applicant.genderLabel,
      ageLabel: input.applicant.ageLabel,
      ageBand: input.applicant.ageBand,
      qualifications: input.applicant.qualifications,
      topDiagnosis: input.diagnosisForCategory
        ? {
            category: input.diagnosisForCategory.category,
            rank: input.diagnosisForCategory.rank,
            score: input.diagnosisForCategory.score,
          }
        : null,
    },
    facility: {
      name: input.facility.name,
      category: input.facility.category,
      categoryLabel: categoryLabelFor(input.facility.category),
      prefecture: input.facility.prefecture,
      city: input.facility.city,
    },
    desired: input.desired ?? {},
    commuteArea: input.commuteArea,
    startMonth: input.desired?.startMonth,
    interviewSummary: input.interviewSummary ?? null,
  };

  const [coverRes, detailRes] = await Promise.all([
    complete<FaxCoverBody>({
      promptName: "fax.cover",
      system: cover,
      user: JSON.stringify(payload),
      model: "smart",
      jsonSchema: coverJsonSchema(),
      maxTokens: 768,
    }),
    complete<FaxDetailBody>({
      promptName: "fax.detail",
      system: detail,
      user: JSON.stringify(payload),
      model: "smart",
      jsonSchema: detailJsonSchema(),
      maxTokens: 1024,
    }),
  ]);

  const provider = coverRes.provider;
  const coverBody = coverRes.ok && coverRes.kind === "json" ? coverRes.data : fallbackCover();
  const detailBody = detailRes.ok && detailRes.kind === "json" ? detailRes.data : fallbackDetail();

  return { cover: coverBody, detail: detailBody, provider };
}

function fallbackCover(): FaxCoverBody {
  return {
    greeting: "拝啓、平素より大変お世話になっております。",
    headline: "ご紹介可能な人材のお知らせ",
    summary:
      "弊社からご紹介可能な候補者をご案内します。詳細は別紙にてお知らせいたします。",
    callToAction: "ご希望の場合は返信欄にご記入のうえご返信ください。",
  };
}

function fallbackDetail(): FaxDetailBody {
  return {
    interviewSummary: "AI 面接サマリは後日改めてお知らせいたします。",
    careerHighlights: [
      "対人ケアの実務経験あり",
      "ご家族・ご利用者との対話を得意",
      "新しい現場への適応力",
    ],
    strengths: ["協調性", "観察力", "段取り力"],
    commuteAreaNote: "通勤可能エリアは本人とすり合わせの上ご共有します。",
    startAvailability: "開始可能時期は別途ご連絡いたします。",
    introTermsNote: "紹介条件・手数料は別紙にてご案内します。",
  };
}

function coverJsonSchema() {
  return {
    type: "object",
    required: ["greeting", "headline", "summary", "callToAction"],
    properties: {
      greeting: { type: "string", maxLength: 120 },
      headline: { type: "string", maxLength: 40 },
      summary: { type: "string", maxLength: 240 },
      callToAction: { type: "string", maxLength: 160 },
    },
    additionalProperties: false,
  };
}
function detailJsonSchema() {
  return {
    type: "object",
    required: [
      "interviewSummary",
      "careerHighlights",
      "strengths",
      "commuteAreaNote",
      "startAvailability",
      "introTermsNote",
    ],
    properties: {
      interviewSummary: { type: "string", maxLength: 240 },
      careerHighlights: { type: "array", items: { type: "string", maxLength: 60 } },
      strengths: { type: "array", items: { type: "string", maxLength: 40 } },
      commuteAreaNote: { type: "string", maxLength: 80 },
      startAvailability: { type: "string", maxLength: 80 },
      introTermsNote: { type: "string", maxLength: 200 },
    },
    additionalProperties: false,
  };
}
