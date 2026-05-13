-- Phase 2: スキルシート自動化 (本人入力 + 履歴書 OCR + メール送信)
-- SkillSheet に submitted/saved/lastEditedBy を追加し、Token / ResumeUpload / EmailLog を新設。

-- ---------------------------
-- SkillSheet に列追加
-- ---------------------------
ALTER TABLE "SkillSheet"
  ADD COLUMN "savedAt" TIMESTAMP(3),
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "lastEditedBy" TEXT;

-- ---------------------------
-- SkillSheetToken
-- ---------------------------
CREATE TABLE "SkillSheetToken" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkillSheetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillSheetToken_token_key" ON "SkillSheetToken"("token");
CREATE INDEX "SkillSheetToken_applicantId_idx" ON "SkillSheetToken"("applicantId");
CREATE INDEX "SkillSheetToken_expiresAt_idx" ON "SkillSheetToken"("expiresAt");

ALTER TABLE "SkillSheetToken"
  ADD CONSTRAINT "SkillSheetToken_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------
-- ResumeUpload
-- ---------------------------
CREATE TABLE "ResumeUpload" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "rawText" TEXT,
  "parsedJson" JSONB,
  "ocrProvider" TEXT,
  "llmProvider" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResumeUpload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeUpload_applicantId_idx" ON "ResumeUpload"("applicantId");
CREATE INDEX "ResumeUpload_status_idx" ON "ResumeUpload"("status");

ALTER TABLE "ResumeUpload"
  ADD CONSTRAINT "ResumeUpload_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------
-- EmailLog
-- ---------------------------
CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT,
  "template" TEXT NOT NULL,
  "toMasked" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'ja',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "storedKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_applicantId_idx" ON "EmailLog"("applicantId");
CREATE INDEX "EmailLog_template_idx" ON "EmailLog"("template");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
