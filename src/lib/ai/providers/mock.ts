import type { CompleteOptions, CompleteResult } from "../client";
import { getMockExpected } from "@/lib/ocr/providers/mock";

import diagnosisTemplates from "./mock-data/diagnosis-comments.json";
import faxBodies from "./mock-data/fax-bodies.json";

type CategoryTemplate = {
  pro: { S?: string[]; A?: string[]; B?: string[]; C?: string[]; D?: string[] };
  con: { S?: string[]; A?: string[]; B?: string[]; C?: string[]; D?: string[] };
};

type DiagnosisTemplates = {
  overview: { S: string[]; A: string[]; B: string[]; C: string[]; D: string[] };
  categories: Record<string, CategoryTemplate>;
};

const TEMPLATES = diagnosisTemplates as unknown as DiagnosisTemplates;

/**
 * 文字列の決定論的ハッシュ。同じ入力で必ず同じ整数を返す (FNV-1a 32-bit)。
 * crypto.subtle はテストで不便なため自前で実装する。
 */
function deterministicHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[deterministicHash(seed) % arr.length];
}

type DiagnosisPayload = {
  applicant: { lastName?: string; firstName?: string };
  ranked: Array<{ category: string; rank: "S" | "A" | "B" | "C" | "D"; score: number }>;
};

type DiagnosisOut = Record<string, { proComment: string; conComment: string }>;

function generateDiagnosis(payload: DiagnosisPayload): DiagnosisOut {
  const out: DiagnosisOut = {};
  // 名前そのものは PII なので、ハッシュ計算のためにのみ使う。返り値には混入させない。
  const nameKey = `${payload.applicant.lastName ?? ""}|${payload.applicant.firstName ?? ""}`;

  for (const row of payload.ranked) {
    const tmpl = TEMPLATES.categories[row.category];
    const proPool = tmpl?.pro[row.rank] ?? tmpl?.pro.B ?? ["前向きに取り組めます。"];
    const conPool = tmpl?.con[row.rank] ?? tmpl?.con.B ?? ["状況に応じた配慮が必要です。"];
    out[row.category] = {
      proComment: pick(proPool, `${nameKey}|${row.category}|pro`),
      conComment: pick(conPool, `${nameKey}|${row.category}|con`),
    };
  }
  return out;
}

function generateOverview(payload: DiagnosisPayload): { overview: string } {
  const top = [...payload.ranked].sort((a, b) => b.score - a.score)[0];
  const rank = top?.rank ?? "B";
  const pool = TEMPLATES.overview[rank] ?? TEMPLATES.overview.B;
  const nameKey = `${payload.applicant.lastName ?? ""}|${payload.applicant.firstName ?? ""}`;
  return { overview: pick(pool, `${nameKey}|overview`) };
}

// ====================
// FAX 本文 (Phase 1-7)
// ====================

type FaxBodiesData = {
  default: {
    cover: {
      greeting: string;
      headline: string;
      summary: Record<"S" | "A" | "B" | "C" | "D", string>;
      callToAction: string;
    };
    detail: {
      interviewSummary: string;
      careerHighlights: string[];
      strengths: string[];
      commuteAreaNote: string;
      startAvailability: string;
      introTermsNote: string;
    };
  };
  categories: Record<
    string,
    {
      cover?: { headline?: string };
      detail?: { careerHighlights?: string[]; strengths?: string[] };
    }
  >;
};
const FAX = faxBodies as unknown as FaxBodiesData;

type FaxPayload = {
  applicant?: {
    initials?: string;
    ageLabel?: string;
    qualifications?: string[];
    topDiagnosis?: { category?: string; rank?: "S" | "A" | "B" | "C" | "D"; score?: number };
  };
  facility?: { name?: string; category?: string; categoryLabel?: string };
  desired?: { schedule?: string; startMonth?: string };
  commuteArea?: string;
  startMonth?: string;
  interviewSummary?: string | null;
};

function generateFaxCover(payload: FaxPayload) {
  const rank = payload.applicant?.topDiagnosis?.rank ?? "B";
  const category = payload.facility?.category;
  const headline =
    (category && FAX.categories[category]?.cover?.headline) ?? FAX.default.cover.headline;
  return {
    greeting: FAX.default.cover.greeting,
    headline,
    summary: FAX.default.cover.summary[rank] ?? FAX.default.cover.summary.B,
    callToAction: FAX.default.cover.callToAction,
  };
}

function generateFaxDetail(payload: FaxPayload) {
  const category = payload.facility?.category;
  const cat = category ? FAX.categories[category]?.detail : undefined;
  return {
    interviewSummary:
      payload.interviewSummary && payload.interviewSummary.length > 0
        ? payload.interviewSummary
        : FAX.default.detail.interviewSummary,
    careerHighlights: cat?.careerHighlights ?? FAX.default.detail.careerHighlights,
    strengths: cat?.strengths ?? FAX.default.detail.strengths,
    commuteAreaNote: payload.commuteArea
      ? `通勤可能エリア: ${payload.commuteArea}`
      : FAX.default.detail.commuteAreaNote,
    startAvailability: payload.startMonth
      ? `開始可能時期: ${payload.startMonth}`
      : FAX.default.detail.startAvailability,
    introTermsNote: FAX.default.detail.introTermsNote,
  };
}

export const mockProvider = {
  name: "mock",
  async complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>> {
    // プロンプト名で分岐し、payload に応じた構造化レスポンスを返す。
    try {
      const userPayload = safeParseJson(opts.user);
      if (opts.promptName === "diagnosis.system") {
        const data = generateDiagnosis(userPayload as DiagnosisPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "diagnosis.overview") {
        const data = generateOverview(userPayload as DiagnosisPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "resume.parse") {
        const data = generateResumeParse(userPayload as ResumeParsePayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "interview.next-question") {
        const data = generateInterviewQuestion(userPayload as InterviewQuestionPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "interview.summary") {
        const data = generateInterviewSummary(userPayload as InterviewSummaryPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "fax.cover") {
        const data = generateFaxCover(userPayload as FaxPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      if (opts.promptName === "fax.detail") {
        const data = generateFaxDetail(userPayload as FaxPayload) as unknown as T;
        return { ok: true, kind: "json", data, provider: "mock" };
      }
      // それ以外は、システムプロンプトの先頭を要約として返す素朴な挙動。
      // Phase 1-5 で必要になれば case を増やす。
      return {
        ok: true,
        kind: "text",
        text: `[mock] (${opts.promptName}) ${opts.system.slice(0, 80)}`,
        provider: "mock",
      };
    } catch (err) {
      return { ok: false, error: `mock_failed: ${(err as Error).message}`, provider: "mock" };
    }
  },
};

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// =========================
// 履歴書パース (Phase 2)
// =========================

type ResumeParsePayload = {
  text?: string;
  preferredLocale?: string;
  /** OCR モックが返した provider 文字列 (例: "mock:nurse-mid-career") */
  ocrProvider?: string;
};

function generateResumeParse(payload: ResumeParsePayload) {
  if (payload.ocrProvider) {
    const expected = getMockExpected(payload.ocrProvider);
    if (expected) return expected;
  }
  if (payload.text) {
    const KEYS = ["nurse-mid-career", "careworker-young", "ja-bachelor-foreign"];
    const key = KEYS[simpleHash(payload.text) % KEYS.length];
    const expected = getMockExpected(`mock:${key}`);
    if (expected) return expected;
  }
  return { educations: [], careers: [], skills: [], selfPR: "" };
}

function simpleHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// =========================
// 面接 (Phase 3)
// =========================

type InterviewQuestionPayload = {
  locale?: string;
  applicant?: {
    initials?: string;
    ageLabel?: string;
    qualifications?: string[];
    topDiagnosis?: { category?: string; rank?: string };
  };
  skillSheet?: { careersSummary?: string; selfPR?: string };
  history?: Array<{ role: "ai" | "applicant"; text: string }>;
  turnIndex: number;
  maxTurns: number;
};

const NEXT_QUESTION_BANK_JA: string[] = [
  "本日はお時間ありがとうございます。まず簡単に、現在のお仕事と担当業務について教えていただけますか？",
  "これまでのご経験の中で、ご自身が一番貢献できたと感じる場面はどのようなものでしたか？",
  "次のお仕事で大切にしたい働き方 (勤務日数や時間帯、夜勤の可否など) を教えてください。",
  "ご自身の強みと、逆に苦手と感じる業務についてそれぞれ教えていただけますか？",
  "ここまでで言い残したことや、こちらへのご質問があればお聞かせください。",
];
const NEXT_QUESTION_BANK_EN: string[] = [
  "Thanks for your time today. Could you start by telling me about your current role and main responsibilities?",
  "Looking back at your career, what is one situation where you contributed the most?",
  "What kind of work schedule are you hoping for next (days per week, day/night shifts)?",
  "Could you share your strengths and any areas you'd like more support in?",
  "Is there anything you'd like to add, or any questions you'd like to ask us?",
];

function generateInterviewQuestion(payload: InterviewQuestionPayload) {
  const locale = payload.locale === "en" ? "en" : "ja";
  const bank = locale === "en" ? NEXT_QUESTION_BANK_EN : NEXT_QUESTION_BANK_JA;
  const turnIndex = Math.max(0, Math.min(bank.length - 1, payload.turnIndex));
  const isLast = turnIndex === Math.max(0, (payload.maxTurns ?? 5) - 1);
  return {
    question: bank[turnIndex],
    intent: ["アイスブレイク", "経歴深掘り", "希望条件", "強み/苦手", "クロージング"][turnIndex],
    shouldClose: isLast || turnIndex === bank.length - 1,
  };
}

type InterviewSummaryPayload = {
  locale?: string;
  applicant?: {
    initials?: string;
    ageLabel?: string;
    topDiagnosis?: { category?: string; rank?: "S" | "A" | "B" | "C" | "D" };
  };
  transcript?: Array<{ role: "ai" | "applicant"; text: string }>;
};

function generateInterviewSummary(payload: InterviewSummaryPayload) {
  const rank = payload.applicant?.topDiagnosis?.rank ?? "B";
  const scoreByRank: Record<string, number> = { S: 88, A: 80, B: 70, C: 58, D: 48 };
  const overallScore = scoreByRank[rank] ?? 70;
  const applicantText = (payload.transcript ?? [])
    .filter((t) => t.role === "applicant")
    .map((t) => t.text)
    .join(" / ");

  return {
    overallScore,
    headline: "現場経験と対話力をバランスよく備えた候補者",
    strengths: ["丁寧な対話", "現場での即応性", "新人育成への意欲"],
    concerns: ["大規模組織でのスピード感に慣れが必要"],
    skillsToAdd: [
      { name: "新人 OJT 経験", level: 4 },
      { name: "ご家族コミュニケーション", level: 4 },
    ],
    desiredUpdates: {
      schedule: "週 3〜4 日の日勤中心、夜勤は要相談",
      startMonth: "",
      areas: [],
      notes: "管理職としてのキャリアにも前向き",
    },
    selfPRDraft:
      applicantText.slice(0, 120) ||
      "ご利用者やご家族との対話を大切にし、現場での即応と新人指導の両立を意識してきました。",
    recommendedNextAction:
      rank === "S" || rank === "A" ? "営業フローに進める" : "別業態も含めた追加面談を提案",
  };
}
