import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { complete } from "@/lib/ai/client";

export type InterviewQuestionInput = {
  locale: string;
  applicant: {
    initials: string;
    ageLabel: string;
    qualifications: string[];
    topDiagnosis?: { category: string; rank: string } | null;
  };
  skillSheet?: { careersSummary?: string; selfPR?: string } | null;
  history: Array<{ role: "ai" | "applicant"; text: string }>;
  turnIndex: number;
  maxTurns: number;
};

export type InterviewQuestion = {
  question: string;
  intent: string;
  shouldClose: boolean;
  provider: string;
};

const PROMPT_PATH = path.join(process.cwd(), "src/prompts/interview.next-question.md");
let cachedPrompt: string | null = null;

async function loadPrompt(): Promise<string> {
  if (!cachedPrompt) cachedPrompt = await readFile(PROMPT_PATH, "utf8");
  return cachedPrompt;
}

const SCHEMA = {
  type: "object",
  required: ["question", "intent", "shouldClose"],
  properties: {
    question: { type: "string", maxLength: 200 },
    intent: { type: "string", maxLength: 120 },
    shouldClose: { type: "boolean" },
  },
  additionalProperties: false,
};

export async function buildNextQuestion(
  input: InterviewQuestionInput,
): Promise<InterviewQuestion> {
  const system = await loadPrompt();
  const res = await complete<{ question: string; intent: string; shouldClose: boolean }>({
    promptName: "interview.next-question",
    system,
    user: JSON.stringify(input),
    model: "smart",
    maxTokens: 384,
    jsonSchema: SCHEMA,
  });
  if (res.ok && res.kind === "json") {
    const data = res.data;
    return {
      question: String(data.question ?? "").slice(0, 200),
      intent: String(data.intent ?? "").slice(0, 120),
      shouldClose: !!data.shouldClose,
      provider: res.provider,
    };
  }
  return {
    question: "他にお伝えしたいことがあれば、ぜひお聞かせください。",
    intent: "クロージング (フォールバック)",
    shouldClose: true,
    provider: res.provider,
  };
}
