-- v1.9: AI 出力レビューワークフロー (Responsible AI)

-- 1) Enums
CREATE TYPE "AiReviewKind" AS ENUM ('DIAGNOSIS', 'FAX_COVER', 'EMAIL_DRAFT', 'INTERVIEW_SUMMARY');
CREATE TYPE "AiReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'EDITED', 'REJECTED');

-- 2) AiReview
CREATE TABLE "AiReview" (
  "id"              TEXT NOT NULL,
  "kind"            "AiReviewKind" NOT NULL,
  "applicantId"     TEXT,
  "refEntityType"   TEXT,
  "refEntityId"     TEXT,
  "aiOutput"        TEXT NOT NULL,
  "finalOutput"     TEXT,
  "confidence"      DOUBLE PRECISION,
  "biasEval"        JSONB,
  "status"          "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewerStaffId" TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "reviewNote"      TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiReview_status_idx" ON "AiReview"("status");
CREATE INDEX "AiReview_kind_idx" ON "AiReview"("kind");
CREATE INDEX "AiReview_applicantId_idx" ON "AiReview"("applicantId");
CREATE INDEX "AiReview_refEntityType_refEntityId_idx" ON "AiReview"("refEntityType", "refEntityId");

ALTER TABLE "AiReview"
  ADD CONSTRAINT "AiReview_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiReview"
  ADD CONSTRAINT "AiReview_reviewerStaffId_fkey"
  FOREIGN KEY ("reviewerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
