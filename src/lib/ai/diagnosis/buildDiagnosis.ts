import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { Diagnosis, FacilityCategory } from "@prisma/client";

import { complete } from "@/lib/ai/client";
import { prisma } from "@/lib/db";
import { ageBand } from "@/lib/mask";

import { buildAllCategoriesScores } from "./index";
import type { CategoryScore } from "./types";

export type BuildDiagnosisResult = {
  applicantId: string;
  provider: string;
  rows: Diagnosis[];
  overview?: string;
};

type CommentMap = Record<string, { proComment: string; conComment: string }>;

const DIAGNOSIS_SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  "src/prompts/diagnosis.system.md",
);

let cachedSystemPrompt: string | null = null;
async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  cachedSystemPrompt = await fs.readFile(DIAGNOSIS_SYSTEM_PROMPT_PATH, "utf8");
  return cachedSystemPrompt;
}

/**
 * applicantId に対する診断を構築し、Diagnosis レコードを DB に保存する。
 *
 *   1. 申込者を取得 (deletedAt 除外)
 *   2. Phase 1-4 のスコア計算で 11 業態のスコアを得る
 *   3. PII を最小化したペイロードで complete() を呼び、proComment/conComment を取得
 *   4. 失敗時は決定論的フォールバック (固定文言) を使う — Diagnosis は必ず保存
 *   5. upsert で 11 行をまとめて書き込み、結果を返す
 */
export async function buildDiagnosis(applicantId: string): Promise<BuildDiagnosisResult> {
  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    include: { qualifications: true },
  });
  if (!applicant) {
    throw new Error(`Applicant not found: ${applicantId}`);
  }

  const scores = buildAllCategoriesScores(
    {
      lastName: applicant.lastName,
      firstName: applicant.firstName,
      birthDate: applicant.birthDate,
      qualifications: applicant.qualifications.map((q) => q.name),
      desiredCategories: applicant.desiredCategories,
    },
    applicant.gender,
  );

  // AI に渡す payload は PII を最小化する。氏名・連絡先・生年月日は送らない。
  const aiPayload = {
    applicant: {
      ageBand: ageBand(applicant.birthDate),
      gender: applicant.gender,
      qualifications: applicant.qualifications.map((q) => q.name),
      desiredCategories: applicant.desiredCategories,
    },
    ranked: scores.map((s) => ({
      category: s.category,
      score: s.score,
      rank: s.rank,
      breakdown: s.breakdown,
    })),
  };

  const system = await loadSystemPrompt();
  const result = await complete<CommentMap>({
    promptName: "diagnosis.system",
    system,
    user: JSON.stringify(aiPayload),
    model: "smart",
    jsonSchema: diagnosisJsonSchema(),
    maxTokens: 2048,
  });

  let comments: CommentMap;
  let provider: string;
  if (result.ok && result.kind === "json") {
    comments = result.data;
    provider = result.provider;
  } else {
    // 失敗時フォールバック (本番想定: Anthropic が落ちている等)。
    // モック実装では通常ここに来ないが、決定論的な代替を用意して Diagnosis を必ず保存する。
    provider = `${result.ok ? "anthropic" : result.provider}+fallback`;
    comments = buildFallbackComments(scores);
  }

  const rows: Diagnosis[] = [];
  for (const s of scores) {
    const c = comments[s.category] ?? fallbackForCategory(s);
    const row = await prisma.diagnosis.upsert({
      where: { applicantId_category: { applicantId, category: s.category } },
      create: {
        applicantId,
        category: s.category,
        score: s.score,
        rank: s.rank,
        proComment: clampComment(c.proComment),
        conComment: clampComment(c.conComment),
      },
      update: {
        score: s.score,
        rank: s.rank,
        proComment: clampComment(c.proComment),
        conComment: clampComment(c.conComment),
        generatedAt: new Date(),
      },
    });
    rows.push(row);
  }

  // ステータス遷移: RECEIVED → DIAGNOSED (より進んでいる場合は維持)。
  // 初回診断完了時のみ、結果通知 + スキルシート入力依頼メールを送る (2 通)。
  let justDiagnosed = false;
  if (applicant.status === "RECEIVED") {
    await prisma.applicant.update({
      where: { id: applicantId },
      data: { status: "DIAGNOSED" },
    });
    justDiagnosed = true;
  }

  if (justDiagnosed) {
    try {
      await notifyDiagnosisReady({ applicantId, rows });
    } catch (err) {
      console.warn("[buildDiagnosis] diagnosis_ready email failed", {
        applicantId,
        err: String(err),
      });
    }
  }

  return { applicantId, provider, rows };
}

async function notifyDiagnosisReady(input: { applicantId: string; rows: Diagnosis[] }) {
  // 動的 import で循環参照を避け、Phase 2 から本ファイルが email レイヤを直接知らないようにする。
  const [{ sendEmail }, { buildDiagnosisReadyEmail }, { FACILITY_CATEGORY_OPTIONS }, tokenLib] =
    await Promise.all([
      import("@/lib/email/client"),
      import("@/lib/email/templates/diagnosis-ready"),
      import("@/lib/constants/applicant-options"),
      import("@/lib/skill-sheet/token"),
    ]);

  const top = [...input.rows].sort((a, b) => b.score - a.score)[0];
  if (!top) return;
  const applicantRow = await prisma.applicant.findFirst({
    where: { id: input.applicantId, deletedAt: null },
    select: {
      email: true,
      lastName: true,
      firstName: true,
      language: true,
    },
  });
  if (!applicantRow) return;
  const token = await tokenLib.ensureSkillSheetToken(input.applicantId);
  const url = tokenLib.buildSkillSheetUrl(tokenLib.resolveAppBaseUrl(), token.token);
  const categoryLabel =
    FACILITY_CATEGORY_OPTIONS.find((o) => o.value === top.category)?.label ?? top.category;
  await sendEmail(
    buildDiagnosisReadyEmail({
      applicantId: input.applicantId,
      to: applicantRow.email,
      lastName: applicantRow.lastName,
      firstName: applicantRow.firstName,
      locale: applicantRow.language ?? "ja",
      topRank: top.rank,
      topCategoryLabel: categoryLabel,
      skillSheetUrl: url,
    }),
  );
}

/** Phase 1-5 の暫定: 80 字を超えるコメントは切り詰める。 */
function clampComment(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 78)}…`;
}

function fallbackForCategory(s: CategoryScore): { proComment: string; conComment: string } {
  return {
    proComment: `${s.rank} 評価で、面接でさらに詳細を伺います。`,
    conComment: "現時点での参考結果です。配属先の文化との相性は面談で確認します。",
  };
}

function buildFallbackComments(scores: CategoryScore[]): CommentMap {
  const out: CommentMap = {};
  for (const s of scores) {
    out[s.category] = fallbackForCategory(s);
  }
  return out;
}

function diagnosisJsonSchema() {
  const categoryComment = {
    type: "object",
    properties: {
      proComment: { type: "string", maxLength: 80 },
      conComment: { type: "string", maxLength: 80 },
    },
    required: ["proComment", "conComment"],
    additionalProperties: false,
  };
  const categories: FacilityCategory[] = [
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
  ];
  const properties: Record<string, typeof categoryComment> = {};
  for (const c of categories) properties[c] = categoryComment;
  return {
    type: "object",
    properties,
    required: categories,
    additionalProperties: false,
  };
}
