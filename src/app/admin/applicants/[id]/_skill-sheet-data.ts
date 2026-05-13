import "server-only";

import type { ResumeUpload, SkillSheet, SkillSheetToken } from "@prisma/client";

import {
  emptySkillSheetContent,
  skillSheetContentSchema,
  type SkillSheetContent,
} from "@/lib/schemas/skill-sheet";

export type SkillSheetTabData = {
  skillSheet:
    | (SkillSheetContent & {
        savedAt: Date | null;
        submittedAt: Date | null;
        completedAt: Date | null;
        lastEditedBy: string | null;
        updatedAt: Date;
      })
    | null;
  resumes: Array<
    Pick<ResumeUpload, "id" | "bytes" | "status" | "ocrProvider" | "llmProvider" | "createdAt">
  >;
  activeToken: Pick<SkillSheetToken, "id" | "expiresAt"> | null;
};

export function buildSkillSheetTabData(input: {
  skillSheet: SkillSheet | null;
  resumes: ResumeUpload[];
  tokens: SkillSheetToken[];
}): SkillSheetTabData {
  const sheet = input.skillSheet;
  const content = sheet
    ? skillSheetContentSchema.parse({
        educations: sheet.educations,
        careers: sheet.careers,
        skills: sheet.skills,
        desired: sheet.desired,
        selfPR: sheet.selfPR ?? "",
      })
    : emptySkillSheetContent();

  const now = Date.now();
  const activeToken = input.tokens
    .filter((t) => !t.revokedAt && t.expiresAt.getTime() > now)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    skillSheet: sheet
      ? {
          ...content,
          savedAt: sheet.savedAt,
          submittedAt: sheet.submittedAt,
          completedAt: sheet.completedAt,
          lastEditedBy: sheet.lastEditedBy,
          updatedAt: sheet.updatedAt,
        }
      : null,
    resumes: input.resumes.map((r) => ({
      id: r.id,
      bytes: r.bytes,
      status: r.status,
      ocrProvider: r.ocrProvider,
      llmProvider: r.llmProvider,
      createdAt: r.createdAt,
    })),
    activeToken: activeToken
      ? { id: activeToken.id, expiresAt: activeToken.expiresAt }
      : null,
  };
}
