import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { complete } from "@/lib/ai/client";

export type ParsedSkillSheet = {
  educations: Array<{ schoolName: string; department: string; graduatedOn: string }>;
  careers: Array<{
    company: string;
    role: string;
    from: string;
    to: string;
    achievements: string;
  }>;
  skills: Array<{ name: string; level: number }>;
  selfPR: string;
};

const PROMPT_PATH = path.join(process.cwd(), "src/prompts/resume.parse.md");
let cachedPrompt: string | null = null;

async function loadPrompt(): Promise<string> {
  if (!cachedPrompt) cachedPrompt = await readFile(PROMPT_PATH, "utf8");
  return cachedPrompt;
}

export type ParseResumeInput = {
  ocrText: string;
  preferredLocale?: string;
  /** OCR モックの provider ラベル。テスト・mock 専用。 */
  ocrProvider?: string;
};

/**
 * OCR テキストを SkillSheet 用 JSON に構造化する。
 * AI_PROVIDER=mock のときは parseResume.ts は実プロンプトを Claude に送らず、
 * モック側でテンプレ的に返す (lib/ai/providers/mock.ts の generateResumeParse)。
 * 失敗時は空のスキルシート (空配列・空文字) を返し、UI 上で本人入力に委ねる。
 */
export async function parseResume(input: ParseResumeInput): Promise<{
  parsed: ParsedSkillSheet;
  provider: string;
}> {
  const system = await loadPrompt();
  const user = JSON.stringify({
    text: input.ocrText,
    preferredLocale: input.preferredLocale ?? "ja",
    ocrProvider: input.ocrProvider,
  });

  const res = await complete<ParsedSkillSheet>({
    promptName: "resume.parse",
    system,
    user,
    model: "smart",
    maxTokens: 2048,
    jsonSchema: SCHEMA,
  });

  if (!res.ok) {
    console.warn("[parseResume] AI failed, returning empty skill sheet", { error: res.error });
    return { parsed: emptySkillSheet(), provider: res.provider };
  }
  if (res.kind !== "json") {
    return { parsed: emptySkillSheet(), provider: res.provider };
  }
  return { parsed: normalize(res.data), provider: res.provider };
}

function emptySkillSheet(): ParsedSkillSheet {
  return { educations: [], careers: [], skills: [], selfPR: "" };
}

/** AI からの返答に欠落キーがあれば埋め、想定外の型は捨てる。 */
function normalize(raw: ParsedSkillSheet | undefined | null): ParsedSkillSheet {
  if (!raw || typeof raw !== "object") return emptySkillSheet();
  return {
    educations: Array.isArray(raw.educations)
      ? raw.educations.map((e) => ({
          schoolName: String(e?.schoolName ?? ""),
          department: String(e?.department ?? ""),
          graduatedOn: String(e?.graduatedOn ?? ""),
        }))
      : [],
    careers: Array.isArray(raw.careers)
      ? raw.careers.map((c) => ({
          company: String(c?.company ?? ""),
          role: String(c?.role ?? ""),
          from: String(c?.from ?? ""),
          to: String(c?.to ?? ""),
          achievements: String(c?.achievements ?? ""),
        }))
      : [],
    skills: Array.isArray(raw.skills)
      ? raw.skills
          .map((s) => ({
            name: String(s?.name ?? ""),
            level: clampLevel(s?.level),
          }))
          .filter((s) => s.name)
      : [],
    selfPR: typeof raw.selfPR === "string" ? raw.selfPR : "",
  };
}

function clampLevel(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

const SCHEMA = {
  type: "object",
  required: ["educations", "careers", "skills", "selfPR"],
  properties: {
    educations: {
      type: "array",
      items: {
        type: "object",
        required: ["schoolName", "department", "graduatedOn"],
        properties: {
          schoolName: { type: "string", maxLength: 100 },
          department: { type: "string", maxLength: 100 },
          graduatedOn: { type: "string", maxLength: 10 },
        },
        additionalProperties: false,
      },
    },
    careers: {
      type: "array",
      items: {
        type: "object",
        required: ["company", "role", "from", "to", "achievements"],
        properties: {
          company: { type: "string", maxLength: 100 },
          role: { type: "string", maxLength: 100 },
          from: { type: "string", maxLength: 10 },
          to: { type: "string", maxLength: 10 },
          achievements: { type: "string", maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "level"],
        properties: {
          name: { type: "string", maxLength: 60 },
          level: { type: "integer", minimum: 1, maximum: 5 },
        },
        additionalProperties: false,
      },
    },
    selfPR: { type: "string", maxLength: 800 },
  },
  additionalProperties: false,
};
