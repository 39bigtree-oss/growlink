import "server-only";

import { randomBytes } from "node:crypto";

import type { ResumeUpload } from "@prisma/client";

import { parseResume } from "@/lib/ai/skill-sheet/parseResume";
import { prisma } from "@/lib/db";
import { recognizeResume } from "@/lib/ocr/client";
import {
  emptySkillSheetContent,
  mergeParsedIntoContent,
  skillSheetContentSchema,
  type SkillSheetContent,
} from "@/lib/schemas/skill-sheet";
import { saveObject } from "@/lib/storage/local";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export type StoreResumeInput = {
  applicantId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

/** ファイルを storage に保存して ResumeUpload レコードを作る。OCR は別関数で開始する。 */
export async function storeResume(input: StoreResumeInput): Promise<ResumeUpload> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new ResumeError("UNSUPPORTED_TYPE", `unsupported mime: ${input.mimeType}`);
  }
  if (input.bytes.length === 0) {
    throw new ResumeError("EMPTY_FILE", "file is empty");
  }
  if (input.bytes.length > MAX_BYTES) {
    throw new ResumeError("TOO_LARGE", `file exceeds ${MAX_BYTES} bytes`);
  }

  const ext = extFor(input.mimeType);
  const fileKey = `resumes/${input.applicantId}/${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  await saveObject(fileKey, input.bytes);

  return prisma.resumeUpload.create({
    data: {
      applicantId: input.applicantId,
      fileKey,
      mimeType: input.mimeType,
      bytes: input.bytes.length,
      status: "uploaded",
    },
  });
}

/**
 * OCR → AI 構造化 → SkillSheet マージまで同期で実行する。
 * Phase 3 で BullMQ ジョブ化するので、現在は呼び出し元の API ルートで await する。
 * 既存 SkillSheet の本人入力欄を上書きせず、空きフィールドのみ埋める (mergeParsedIntoContent)。
 */
export async function processResume(uploadId: string): Promise<{
  upload: ResumeUpload;
  parsedSnippet: { educations: number; careers: number; skills: number };
}> {
  const upload = await prisma.resumeUpload.findUnique({ where: { id: uploadId } });
  if (!upload) throw new ResumeError("NOT_FOUND", `upload ${uploadId} not found`);

  await prisma.resumeUpload.update({
    where: { id: uploadId },
    data: { status: "ocr_running" },
  });

  try {
    // 1) OCR
    const { readObject } = await import("@/lib/storage/local");
    const bytes = await readObject(upload.fileKey);
    if (!bytes) throw new ResumeError("FILE_MISSING", `file ${upload.fileKey} missing in storage`);
    const ocr = await recognizeResume({
      bytes,
      mimeType: upload.mimeType,
      fileName: upload.fileKey,
    });

    // 2) Claude で JSON 化
    const parse = await parseResume({
      ocrText: ocr.fullText,
      ocrProvider: ocr.provider,
    });

    // 3) SkillSheet にマージ (本人入力優先)
    const applicant = await prisma.applicant.findFirst({
      where: { id: upload.applicantId, deletedAt: null },
      include: { skillSheet: true },
    });
    if (!applicant) throw new ResumeError("APPLICANT_GONE", "applicant deleted");

    const current = applicant.skillSheet
      ? skillSheetContentSchema.parse({
          educations: applicant.skillSheet.educations,
          careers: applicant.skillSheet.careers,
          skills: applicant.skillSheet.skills,
          desired: applicant.skillSheet.desired,
          selfPR: applicant.skillSheet.selfPR ?? "",
        })
      : emptySkillSheetContent();
    const merged = mergeParsedIntoContent(current, parse.parsed);

    await prisma.skillSheet.upsert({
      where: { applicantId: upload.applicantId },
      create: {
        applicantId: upload.applicantId,
        educations: merged.educations,
        careers: merged.careers,
        skills: merged.skills,
        desired: merged.desired,
        selfPR: merged.selfPR,
        rawResumeKey: upload.fileKey,
        lastEditedBy: "ocr",
        savedAt: new Date(),
      },
      update: {
        educations: merged.educations,
        careers: merged.careers,
        skills: merged.skills,
        desired: merged.desired,
        selfPR: merged.selfPR,
        rawResumeKey: upload.fileKey,
        lastEditedBy: "ocr",
        savedAt: new Date(),
      },
    });

    const updated = await prisma.resumeUpload.update({
      where: { id: uploadId },
      data: {
        rawText: ocr.fullText,
        parsedJson: parse.parsed as unknown as object,
        ocrProvider: ocr.provider,
        llmProvider: parse.provider,
        status: "merged",
        errorMessage: null,
      },
    });

    return {
      upload: updated,
      parsedSnippet: {
        educations: parse.parsed.educations.length,
        careers: parse.parsed.careers.length,
        skills: parse.parsed.skills.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.resumeUpload.update({
      where: { id: uploadId },
      data: { status: "ocr_failed", errorMessage: message },
    });
    throw err;
  }
}

/**
 * 「本人入力済 SkillSheet」をそのまま取得 (なければ空)。
 */
export async function loadSkillSheetContent(applicantId: string): Promise<SkillSheetContent> {
  const sheet = await prisma.skillSheet.findUnique({ where: { applicantId } });
  if (!sheet) return emptySkillSheetContent();
  return skillSheetContentSchema.parse({
    educations: sheet.educations,
    careers: sheet.careers,
    skills: sheet.skills,
    desired: sheet.desired,
    selfPR: sheet.selfPR ?? "",
  });
}

export class ResumeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ResumeError";
  }
}

function extFor(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "image/png":
      return ".png";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}
