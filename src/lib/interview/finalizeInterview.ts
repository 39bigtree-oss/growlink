import "server-only";

import { summarizeInterview, type InterviewSummary } from "@/lib/ai/interview/summarizeInterview";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildInterviewCompletedEmail } from "@/lib/email/templates/interview-completed";
import {
  emptySkillSheetContent,
  skillSheetContentSchema,
  type SkillSheetContent,
} from "@/lib/schemas/skill-sheet";

/**
 * 面接終了時の後処理:
 *   1. 全 turns を文字起こしに連結
 *   2. interview.summary プロンプトで構造化要約
 *   3. SkillSheet に差分マージ (本人入力欄を上書きしない)
 *   4. Applicant.status を INTERVIEW_DONE に進める
 *   5. 面接完了の通知メールを送る (locale を考慮)
 */
export async function finalizeInterview(interviewId: string): Promise<void> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      applicant: {
        include: {
          skillSheet: true,
          diagnoses: { orderBy: { score: "desc" }, take: 1 },
        },
      },
      turns: { orderBy: { turnIndex: "asc" } },
    },
  });
  if (!interview) throw new Error(`Interview not found: ${interviewId}`);
  if (interview.status === "completed") return;

  const transcriptArray = interview.turns.map((t) => ({
    role: t.role as "ai" | "applicant",
    text: t.text,
  }));
  const transcriptText = transcriptArray.map((t) => `${t.role}: ${t.text}`).join("\n");

  const topDiag = interview.applicant.diagnoses[0] ?? null;
  const summary = await summarizeInterview({
    locale: interview.language,
    applicant: {
      initials: initialsOf(interview.applicant.lastName, interview.applicant.firstName),
      ageLabel: "—",
      topDiagnosis: topDiag ? { category: topDiag.category, rank: topDiag.rank } : null,
    },
    transcript: transcriptArray,
  });

  const current = interview.applicant.skillSheet
    ? skillSheetContentSchema.parse({
        educations: interview.applicant.skillSheet.educations,
        careers: interview.applicant.skillSheet.careers,
        skills: interview.applicant.skillSheet.skills,
        desired: interview.applicant.skillSheet.desired,
        selfPR: interview.applicant.skillSheet.selfPR ?? "",
      })
    : emptySkillSheetContent();

  const merged = mergeInterviewIntoContent(current, summary);

  await prisma.skillSheet.upsert({
    where: { applicantId: interview.applicantId },
    create: {
      applicantId: interview.applicantId,
      educations: merged.educations,
      careers: merged.careers,
      skills: merged.skills,
      desired: merged.desired,
      selfPR: merged.selfPR,
      lastEditedBy: "ai-interview",
      savedAt: new Date(),
    },
    update: {
      educations: merged.educations,
      careers: merged.careers,
      skills: merged.skills,
      desired: merged.desired,
      selfPR: merged.selfPR,
      lastEditedBy: "ai-interview",
      savedAt: new Date(),
    },
  });

  await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "completed",
      transcript: transcriptText,
      summary: summary as unknown as object,
      endedAt: interview.endedAt ?? new Date(),
    },
  });

  // Applicant.status は status-machine に従う:
  //   SKILL_SHEET_INPROGRESS / SKILL_SHEET_DONE / DIAGNOSED → INTERVIEW_DONE
  await prisma.applicant.updateMany({
    where: {
      id: interview.applicantId,
      status: { in: ["DIAGNOSED", "SKILL_SHEET_INPROGRESS", "SKILL_SHEET_DONE"] },
    },
    data: { status: "INTERVIEW_DONE" },
  });

  // 通知メール (失敗は warn のみ)
  try {
    await sendEmail(
      buildInterviewCompletedEmail({
        applicantId: interview.applicantId,
        to: interview.applicant.email,
        lastName: interview.applicant.lastName,
        firstName: interview.applicant.firstName,
        locale: interview.language,
      }),
    );
  } catch (err) {
    console.warn("[finalizeInterview] notify email failed", { interviewId, err: String(err) });
  }
}

/**
 * AI 面接サマリを SkillSheet にマージ。
 * - 本人入力済の欄は上書きしない (mergeParsedIntoContent と同じポリシー)
 * - skills は追加のみ (重複は name 一致でスキップ)
 * - desired.notes は要約の notes を末尾に追記 (本人 notes を消さない)
 */
export function mergeInterviewIntoContent(
  current: SkillSheetContent,
  summary: InterviewSummary,
): SkillSheetContent {
  const existingNames = new Set(current.skills.map((s) => s.name));
  const newSkills = summary.skillsToAdd.filter((s) => !existingNames.has(s.name));

  return {
    ...current,
    skills: [...current.skills, ...newSkills].slice(0, 40),
    desired: {
      areas:
        current.desired.areas.length > 0
          ? current.desired.areas
          : (summary.desiredUpdates.areas ?? []),
      schedule: current.desired.schedule || summary.desiredUpdates.schedule || "",
      startMonth: current.desired.startMonth || summary.desiredUpdates.startMonth || "",
      salary: current.desired.salary ?? null,
      notes:
        current.desired.notes && summary.desiredUpdates.notes
          ? `${current.desired.notes}\n[AI面接]${summary.desiredUpdates.notes}`
          : current.desired.notes || summary.desiredUpdates.notes || "",
    },
    selfPR: current.selfPR || summary.selfPRDraft || "",
  };
}

function initialsOf(lastName: string | null, firstName: string | null): string {
  const a = (lastName ?? "").trim()[0] ?? "";
  const b = (firstName ?? "").trim()[0] ?? "";
  if (!a && !b) return "N.N";
  return `${a || "."}.${b || ""}`;
}
