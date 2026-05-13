-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'CONSULTANT', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('S', 'A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('RECEIVED', 'DIAGNOSED', 'SKILL_SHEET_INPROGRESS', 'SKILL_SHEET_DONE', 'INTERVIEW_DONE', 'SALES_READY', 'IN_INTRODUCTION', 'CONTRACTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FacilityCategory" AS ENUM ('HOSPITAL_ACUTE', 'HOSPITAL_GENERAL', 'CLINIC', 'DAYCARE_ELDERLY', 'REHAB_DAY', 'HOMEVISIT_NURSE', 'HOMEVISIT_NURSE_PSYCHIATRY', 'HOMEVISIT_CARE', 'DAYCARE_DISABILITY', 'HOMEVISIT_DISABILITY', 'GROUP_HOME_DISABILITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastNameKana" TEXT NOT NULL,
    "firstNameKana" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationality" TEXT,
    "language" TEXT DEFAULT 'ja',
    "wantsDiagnosis" BOOLEAN NOT NULL DEFAULT true,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'RECEIVED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquiredOn" TIMESTAMP(3),
    "number" TEXT,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "category" "FacilityCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" "Rank" NOT NULL,
    "proComment" TEXT NOT NULL,
    "conComment" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillSheet" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "educations" JSONB NOT NULL,
    "careers" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "desired" JSONB NOT NULL,
    "selfPR" TEXT,
    "rawResumeKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "callSid" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "transcript" TEXT,
    "summary" JSONB,
    "audioKey" TEXT,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FacilityCategory" NOT NULL,
    "prefecture" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "fax" TEXT,
    "email" TEXT,
    "isFaxPublic" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaxSheet" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "pdfKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaxSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaxReaction" (
    "id" TEXT NOT NULL,
    "faxSheetId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "interested" BOOLEAN NOT NULL,
    "comment" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaxReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_email_key" ON "Applicant"("email");

-- CreateIndex
CREATE INDEX "Applicant_status_idx" ON "Applicant"("status");

-- CreateIndex
CREATE INDEX "Applicant_deletedAt_idx" ON "Applicant"("deletedAt");

-- CreateIndex
CREATE INDEX "Applicant_createdAt_idx" ON "Applicant"("createdAt");

-- CreateIndex
CREATE INDEX "Qualification_applicantId_idx" ON "Qualification"("applicantId");

-- CreateIndex
CREATE INDEX "Diagnosis_rank_idx" ON "Diagnosis"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_applicantId_category_key" ON "Diagnosis"("applicantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SkillSheet_applicantId_key" ON "SkillSheet"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_applicantId_key" ON "Interview"("applicantId");

-- CreateIndex
CREATE INDEX "Facility_category_idx" ON "Facility"("category");

-- CreateIndex
CREATE INDEX "Facility_prefecture_idx" ON "Facility"("prefecture");

-- CreateIndex
CREATE INDEX "FaxSheet_applicantId_idx" ON "FaxSheet"("applicantId");

-- CreateIndex
CREATE INDEX "FaxSheet_facilityId_idx" ON "FaxSheet"("facilityId");

-- CreateIndex
CREATE INDEX "FaxSheet_status_idx" ON "FaxSheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FaxReaction_faxSheetId_key" ON "FaxReaction"("faxSheetId");

-- CreateIndex
CREATE INDEX "FaxReaction_facilityId_idx" ON "FaxReaction"("facilityId");

-- CreateIndex
CREATE INDEX "AuditLog_staffId_idx" ON "AuditLog"("staffId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillSheet" ADD CONSTRAINT "SkillSheet_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxSheet" ADD CONSTRAINT "FaxSheet_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxSheet" ADD CONSTRAINT "FaxSheet_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxReaction" ADD CONSTRAINT "FaxReaction_faxSheetId_fkey" FOREIGN KEY ("faxSheetId") REFERENCES "FaxSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxReaction" ADD CONSTRAINT "FaxReaction_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

