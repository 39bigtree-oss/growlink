-- v1.8: 施設ポータル + ナーチャシナリオ + 監査チェックポイント + Facility 緯度経度

-- 1) Enums
CREATE TYPE "NurtureTrigger" AS ENUM ('FAX_SENT_NO_REPLY', 'SKILL_SHEET_INVITED_NO_SUBMIT', 'INTEREST_RECEIVED', 'PLACEMENT_1MONTH', 'PLACEMENT_3MONTH');
CREATE TYPE "NurtureStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED');
CREATE TYPE "NurtureStepKind" AS ENUM ('EMAIL', 'STAFF_TODO', 'WAIT');

-- 2) Facility.lat / lng (Haversine 距離マッチング用)
ALTER TABLE "Facility" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Facility" ADD COLUMN "lng" DOUBLE PRECISION;

-- 3) FacilityPortalToken (ログイン不要の HMAC token)
CREATE TABLE "FacilityPortalToken" (
  "id"          TEXT NOT NULL,
  "facilityId"  TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "label"       TEXT,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "revokedAt"   TIMESTAMP(3),
  "lastSeenAt"  TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"   TEXT,
  CONSTRAINT "FacilityPortalToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FacilityPortalToken_token_key" ON "FacilityPortalToken"("token");
CREATE INDEX "FacilityPortalToken_facilityId_idx" ON "FacilityPortalToken"("facilityId");
CREATE INDEX "FacilityPortalToken_expiresAt_idx" ON "FacilityPortalToken"("expiresAt");
ALTER TABLE "FacilityPortalToken"
  ADD CONSTRAINT "FacilityPortalToken_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) NurtureSequence
CREATE TABLE "NurtureSequence" (
  "id"          TEXT NOT NULL,
  "applicantId" TEXT,
  "placementId" TEXT,
  "trigger"     "NurtureTrigger" NOT NULL,
  "status"      "NurtureStatus" NOT NULL DEFAULT 'ACTIVE',
  "steps"       JSONB NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextRunAt"   TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NurtureSequence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NurtureSequence_status_idx" ON "NurtureSequence"("status");
CREATE INDEX "NurtureSequence_nextRunAt_idx" ON "NurtureSequence"("nextRunAt");
CREATE INDEX "NurtureSequence_trigger_idx" ON "NurtureSequence"("trigger");
CREATE INDEX "NurtureSequence_applicantId_idx" ON "NurtureSequence"("applicantId");
ALTER TABLE "NurtureSequence"
  ADD CONSTRAINT "NurtureSequence_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NurtureSequence"
  ADD CONSTRAINT "NurtureSequence_placementId_fkey"
  FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) NurtureStepExecution
CREATE TABLE "NurtureStepExecution" (
  "id"         TEXT NOT NULL,
  "sequenceId" TEXT NOT NULL,
  "stepIndex"  INTEGER NOT NULL,
  "kind"       "NurtureStepKind" NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result"     TEXT NOT NULL,
  "payload"    JSONB,
  CONSTRAINT "NurtureStepExecution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NurtureStepExecution_sequenceId_idx" ON "NurtureStepExecution"("sequenceId");
CREATE INDEX "NurtureStepExecution_executedAt_idx" ON "NurtureStepExecution"("executedAt");
ALTER TABLE "NurtureStepExecution"
  ADD CONSTRAINT "NurtureStepExecution_sequenceId_fkey"
  FOREIGN KEY ("sequenceId") REFERENCES "NurtureSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) AuditCheckpoint
CREATE TABLE "AuditCheckpoint" (
  "id"             TEXT NOT NULL,
  "lastEventHash"  TEXT NOT NULL,
  "eventCountAtCp" INTEGER NOT NULL,
  "note"           TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditCheckpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditCheckpoint_createdAt_idx" ON "AuditCheckpoint"("createdAt");
