import "server-only";

import type { Interview, InterviewTurn } from "@prisma/client";

import { buildNextQuestion } from "@/lib/ai/interview/buildNextQuestion";
import { prisma } from "@/lib/db";
import {
  emptySkillSheetContent,
  skillSheetContentSchema,
} from "@/lib/schemas/skill-sheet";
import { synthesize } from "@/lib/tts/client";
import { transcribe } from "@/lib/stt/client";

export const INTERVIEW_MAX_TURNS = 5;

export async function ensureInterview(applicantId: string): Promise<Interview> {
  const existing = await prisma.interview.findUnique({ where: { applicantId } });
  if (existing) return existing;
  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    select: { language: true },
  });
  return prisma.interview.create({
    data: {
      applicantId,
      status: "scheduled",
      language: applicant?.language ?? "ja",
    },
  });
}

export async function startInterview(interviewId: string, channel: "voice" | "text"): Promise<Interview> {
  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "in_progress",
      startedAt: new Date(),
      channel,
      provider: process.env.TWILIO_PROVIDER ?? "mock",
    },
  });
}

export type NextQuestionResult = {
  question: string;
  intent: string;
  shouldClose: boolean;
  turn: InterviewTurn;
  audioKey: string | null;
};

/**
 * 「次の AI 質問」を生成して InterviewTurn として保存する。
 * 同時に TTS で音声プレースホルダ (mock は無音 mp3) を作成し、audioKey をターンに紐付ける。
 */
export async function generateNextQuestion(interviewId: string): Promise<NextQuestionResult> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      applicant: {
        include: {
          qualifications: true,
          skillSheet: true,
          diagnoses: { orderBy: { score: "desc" }, take: 1 },
        },
      },
      turns: { orderBy: { turnIndex: "asc" } },
    },
  });
  if (!interview) throw new Error(`Interview not found: ${interviewId}`);
  if (interview.status === "completed") throw new Error("interview already completed");

  const turnIndex = interview.turns.length;
  if (turnIndex >= INTERVIEW_MAX_TURNS) {
    throw new Error("interview already at max turns");
  }

  const history = interview.turns.map((t) => ({ role: t.role as "ai" | "applicant", text: t.text }));
  const topDiag = interview.applicant.diagnoses[0] ?? null;
  const skillSheet = interview.applicant.skillSheet;
  const careersSummary = summarizeCareers(skillSheet?.careers);

  const q = await buildNextQuestion({
    locale: interview.language,
    applicant: {
      initials: initialsOf(interview.applicant.lastName, interview.applicant.firstName),
      ageLabel: "—",
      qualifications: interview.applicant.qualifications.map((q) => q.name),
      topDiagnosis: topDiag ? { category: topDiag.category, rank: topDiag.rank } : null,
    },
    skillSheet: skillSheet
      ? { careersSummary, selfPR: (skillSheet.selfPR ?? "").slice(0, 200) }
      : null,
    history,
    turnIndex,
    maxTurns: INTERVIEW_MAX_TURNS,
  });

  // TTS で音声を生成 (mock は無音 mp3)。本番では別 TTS provider に差し替え。
  const tts = await synthesize({ text: q.question, language: interview.language });
  const turn = await prisma.interviewTurn.create({
    data: {
      interviewId,
      turnIndex,
      role: "ai",
      text: q.question,
      audioKey: tts.audioKey,
      provider: q.provider,
    },
  });
  await prisma.interview.update({
    where: { id: interviewId },
    data: { turnCount: turnIndex + 1 },
  });

  return {
    question: q.question,
    intent: q.intent,
    shouldClose: q.shouldClose,
    turn,
    audioKey: tts.audioKey,
  };
}

export type SubmitAnswerInput =
  | { interviewId: string; text: string }
  | { interviewId: string; audioBytes: Buffer; audioKey?: string };

export async function submitAnswer(input: SubmitAnswerInput): Promise<InterviewTurn> {
  const interview = await prisma.interview.findUnique({
    where: { id: input.interviewId },
    include: { turns: { orderBy: { turnIndex: "asc" } } },
  });
  if (!interview) throw new Error(`Interview not found: ${input.interviewId}`);

  // 答えは「直前の ai 質問」と同じ turnIndex で role=applicant を一段ずらすのではなく、
  // ターン番号は累積させる。 (q, a, q, a, ...) で連番。
  const turnIndex = interview.turns.length;

  let text: string;
  let provider: string | undefined;
  if ("text" in input) {
    text = input.text;
    provider = "manual";
  } else {
    // 音声 → STT。mock は固定文字列を返す。
    const aiQuestionsSoFar = interview.turns.filter((t) => t.role === "ai").length;
    const stt = await transcribe({
      bytes: input.audioBytes,
      audioKey: input.audioKey,
      language: interview.language,
      hint: { turnIndex: aiQuestionsSoFar - 1, seed: interview.id },
    });
    text = stt.text;
    provider = `stt:${stt.provider}`;
  }

  return prisma.interviewTurn.create({
    data: {
      interviewId: input.interviewId,
      turnIndex,
      role: "applicant",
      text,
      provider,
    },
  });
}

export async function endInterview(interviewId: string): Promise<Interview> {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new Error(`Interview not found: ${interviewId}`);
  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: interview.status === "completed" ? "completed" : "in_progress",
      endedAt: new Date(),
      durationSec:
        interview.startedAt
          ? Math.max(1, Math.floor((Date.now() - interview.startedAt.getTime()) / 1000))
          : null,
    },
  });
}

function initialsOf(lastName: string | null | undefined, firstName: string | null | undefined): string {
  const a = (lastName ?? "").trim()[0] ?? "";
  const b = (firstName ?? "").trim()[0] ?? "";
  if (!a && !b) return "N.N";
  return `${a || "."}.${b || ""}`;
}

function summarizeCareers(careers: unknown): string {
  if (!Array.isArray(careers) || careers.length === 0) return "";
  return careers
    .map((c: { company?: string; role?: string; from?: string; to?: string }) => {
      const period = `${c.from ?? ""}〜${c.to || "現在"}`;
      return `${c.company ?? ""} (${c.role ?? ""}) ${period}`;
    })
    .join(" / ")
    .slice(0, 240);
}

export function emptyContent() {
  // Phase 2 の Zod default を再利用するヘルパ。
  return skillSheetContentSchema.parse(emptySkillSheetContent());
}
