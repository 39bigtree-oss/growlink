import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { complete } from "@/lib/ai/client";

export type InterviewSummaryInput = {
  locale: string;
  applicant: {
    initials: string;
    ageLabel: string;
    topDiagnosis?: { category: string; rank: string } | null;
  };
  transcript: Array<{ role: "ai" | "applicant"; text: string }>;
};

export type InterviewSummary = {
  overallScore: number;
  headline: string;
  strengths: string[];
  concerns: string[];
  skillsToAdd: Array<{ name: string; level: number }>;
  desiredUpdates: {
    schedule: string;
    startMonth: string;
    areas: string[];
    notes: string;
  };
  selfPRDraft: string;
  recommendedNextAction: string;
  provider: string;
};

const PROMPT_PATH = path.join(process.cwd(), "src/prompts/interview.summary.md");
let cachedPrompt: string | null = null;

async function loadPrompt(): Promise<string> {
  if (!cachedPrompt) cachedPrompt = await readFile(PROMPT_PATH, "utf8");
  return cachedPrompt;
}

const SCHEMA = {
  type: "object",
  required: [
    "overallScore",
    "headline",
    "strengths",
    "concerns",
    "skillsToAdd",
    "desiredUpdates",
    "selfPRDraft",
    "recommendedNextAction",
  ],
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    headline: { type: "string", maxLength: 80 },
    strengths: { type: "array", items: { type: "string", maxLength: 40 } },
    concerns: { type: "array", items: { type: "string", maxLength: 80 } },
    skillsToAdd: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "level"],
        properties: {
          name: { type: "string", maxLength: 80 },
          level: { type: "integer", minimum: 1, maximum: 5 },
        },
        additionalProperties: false,
      },
    },
    desiredUpdates: {
      type: "object",
      required: ["schedule", "startMonth", "areas", "notes"],
      properties: {
        schedule: { type: "string", maxLength: 200 },
        startMonth: { type: "string", maxLength: 10 },
        areas: { type: "array", items: { type: "string", maxLength: 80 } },
        notes: { type: "string", maxLength: 240 },
      },
      additionalProperties: false,
    },
    selfPRDraft: { type: "string", maxLength: 240 },
    recommendedNextAction: { type: "string", maxLength: 120 },
  },
  additionalProperties: false,
};

export async function summarizeInterview(
  input: InterviewSummaryInput,
): Promise<InterviewSummary> {
  const system = await loadPrompt();
  const res = await complete<Omit<InterviewSummary, "provider">>({
    promptName: "interview.summary",
    system,
    user: JSON.stringify(input),
    model: "smart",
    maxTokens: 1024,
    jsonSchema: SCHEMA,
  });
  if (res.ok && res.kind === "json") {
    return { ...normalize(res.data), provider: res.provider };
  }
  console.warn("[summarizeInterview] AI failed, returning fallback", { error: res.ok ? null : res.error });
  return { ...fallback(), provider: res.provider };
}

function fallback(): Omit<InterviewSummary, "provider"> {
  return {
    overallScore: 70,
    headline: "面接サマリは後日担当者が追記します。",
    strengths: ["丁寧な対話", "現場での即応性", "学習意欲"],
    concerns: ["別途確認したい項目があります"],
    skillsToAdd: [],
    desiredUpdates: { schedule: "", startMonth: "", areas: [], notes: "" },
    selfPRDraft: "",
    recommendedNextAction: "担当者が要追加面談を判断",
  };
}

function normalize(raw: Omit<InterviewSummary, "provider"> | null | undefined): Omit<InterviewSummary, "provider"> {
  if (!raw || typeof raw !== "object") return fallback();
  return {
    overallScore: clampInt(raw.overallScore, 0, 100, 70),
    headline: String(raw.headline ?? "").slice(0, 80),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 5).map((s) => String(s).slice(0, 40)) : [],
    concerns: Array.isArray(raw.concerns) ? raw.concerns.slice(0, 3).map((s) => String(s).slice(0, 80)) : [],
    skillsToAdd: Array.isArray(raw.skillsToAdd)
      ? raw.skillsToAdd
          .slice(0, 5)
          .map((s) => ({ name: String(s?.name ?? "").slice(0, 80), level: clampInt(s?.level, 1, 5, 3) }))
          .filter((s) => s.name)
      : [],
    desiredUpdates: {
      schedule: String(raw.desiredUpdates?.schedule ?? "").slice(0, 200),
      startMonth: String(raw.desiredUpdates?.startMonth ?? "").slice(0, 10),
      areas: Array.isArray(raw.desiredUpdates?.areas)
        ? raw.desiredUpdates.areas.slice(0, 10).map((s) => String(s).slice(0, 80))
        : [],
      notes: String(raw.desiredUpdates?.notes ?? "").slice(0, 240),
    },
    selfPRDraft: String(raw.selfPRDraft ?? "").slice(0, 240),
    recommendedNextAction: String(raw.recommendedNextAction ?? "").slice(0, 120),
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
