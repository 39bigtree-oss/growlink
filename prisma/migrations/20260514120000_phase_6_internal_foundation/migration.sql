-- Phase 6: 完璧な内部システム化のための基盤テーブル + enum を一括追加。
-- docs/internal-system-spec.md を参照。
--
-- 追加するもの:
--   * 12 enums (JobPosition / EmploymentType / JobOrderStatus / JobOrderUrgency /
--               ContractType / ContractStatus / ESignProvider / PlacementFeeStatus /
--               InvoiceStatus / MyNumberPurpose / MyNumberAccessAction)
--   * 9 tables (JobOrder / RefundPolicy / Contract / Placement / Invoice /
--               DispatchLedger / MyNumberRecord / MyNumberAccessLog / AuditEvent)
--   * ResidenceStatus.alertSentAt 列 (在留期限アラート重複送信防止)

-- ==========
-- 1) Enums
-- ==========
CREATE TYPE "JobPosition" AS ENUM ('NURSE', 'CARE_WORKER', 'PT_OT_ST', 'SOCIAL_WORKER', 'CARE_MANAGER', 'OTHER');
CREATE TYPE "EmploymentType" AS ENUM ('DISPATCH', 'DIRECT', 'TEMP_TO_PERM', 'PART_TIME');
CREATE TYPE "JobOrderStatus" AS ENUM ('OPEN', 'HOLD', 'FILLED', 'CLOSED');
CREATE TYPE "JobOrderUrgency" AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');
CREATE TYPE "ContractType" AS ENUM ('DISPATCH_AGREEMENT', 'INTRODUCTION_FEE', 'TEMP_TO_PERM');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "ESignProvider" AS ENUM ('MOCK', 'CLOUDSIGN', 'GMO_SIGN');
CREATE TYPE "PlacementFeeStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'REFUNDED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "MyNumberPurpose" AS ENUM ('WITHHOLDING', 'SOCIAL_INSURANCE', 'EMPLOYMENT_INSURANCE');
CREATE TYPE "MyNumberAccessAction" AS ENUM ('VIEW', 'UPDATE', 'DELETE', 'EXPORT');

-- ==========
-- 2) ResidenceStatus.alertSentAt 列追加 (在留期限アラートの重複送信防止)
-- ==========
ALTER TABLE "ResidenceStatus" ADD COLUMN "alertSentAt" TIMESTAMP(3);

-- ==========
-- 3) JobOrder: 求人案件 (Facility:1 → JobOrder:N)
-- ==========
CREATE TABLE "JobOrder" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" "JobPosition" NOT NULL,
  "employmentType" "EmploymentType" NOT NULL,
  "hourlyWageMin" INTEGER,
  "hourlyWageMax" INTEGER,
  "monthlyWageMin" INTEGER,
  "monthlyWageMax" INTEGER,
  "shiftPattern" JSONB,
  "requiredQualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredQualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "minExperienceYears" INTEGER NOT NULL DEFAULT 0,
  "headcount" INTEGER NOT NULL DEFAULT 1,
  "status" "JobOrderStatus" NOT NULL DEFAULT 'OPEN',
  "urgency" "JobOrderUrgency" NOT NULL DEFAULT 'NORMAL',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "nearestStation" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JobOrder_facilityId_idx" ON "JobOrder"("facilityId");
CREATE INDEX "JobOrder_status_idx" ON "JobOrder"("status");
CREATE INDEX "JobOrder_position_idx" ON "JobOrder"("position");
CREATE INDEX "JobOrder_urgency_idx" ON "JobOrder"("urgency");
ALTER TABLE "JobOrder"
  ADD CONSTRAINT "JobOrder_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========
-- 4) RefundPolicy: 返金規定 (Contract から参照)
-- ==========
CREATE TABLE "RefundPolicy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tiers" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefundPolicy_name_key" ON "RefundPolicy"("name");

-- ==========
-- 5) Contract: 取引契約 (施設との紹介・派遣契約)
-- ==========
CREATE TABLE "Contract" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "contractType" "ContractType" NOT NULL,
  "feeRate" DECIMAL(6,4) NOT NULL,
  "refundPolicyId" TEXT,
  "paymentTermDays" INTEGER NOT NULL DEFAULT 60,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "signedBy" TEXT,
  "eSignProvider" "ESignProvider" NOT NULL DEFAULT 'MOCK',
  "eSignDocId" TEXT,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Contract_facilityId_idx" ON "Contract"("facilityId");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
CREATE INDEX "Contract_startDate_idx" ON "Contract"("startDate");
ALTER TABLE "Contract"
  ADD CONSTRAINT "Contract_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract"
  ADD CONSTRAINT "Contract_refundPolicyId_fkey"
  FOREIGN KEY ("refundPolicyId") REFERENCES "RefundPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==========
-- 6) Placement: 紹介成立 (Applicant × Facility × JobOrder × Contract)
-- ==========
CREATE TABLE "Placement" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "jobOrderId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "monthlyWage" DECIMAL(12,2) NOT NULL,
  "introductionFee" DECIMAL(12,2) NOT NULL,
  "feeStatus" "PlacementFeeStatus" NOT NULL DEFAULT 'PENDING',
  "refundDueDate" TIMESTAMP(3),
  "attritionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Placement_applicantId_idx" ON "Placement"("applicantId");
CREATE INDEX "Placement_facilityId_idx" ON "Placement"("facilityId");
CREATE INDEX "Placement_feeStatus_idx" ON "Placement"("feeStatus");
CREATE INDEX "Placement_startDate_idx" ON "Placement"("startDate");
ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_jobOrderId_fkey"
  FOREIGN KEY ("jobOrderId") REFERENCES "JobOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Placement"
  ADD CONSTRAINT "Placement_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========
-- 7) Invoice: 請求書
-- ==========
CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "placementId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "amount" DECIMAL(12,2) NOT NULL,
  "tax" DECIMAL(12,2) NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "pdfKey" TEXT,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_facilityId_idx" ON "Invoice"("facilityId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_placementId_fkey"
  FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==========
-- 8) DispatchLedger: 派遣台帳 (派遣業法対応)。Placement と 1:1。
-- ==========
CREATE TABLE "DispatchLedger" (
  "id" TEXT NOT NULL,
  "placementId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "jobOrderId" TEXT NOT NULL,
  "antiteishokuDate" TIMESTAMP(3) NOT NULL,
  "dispatchPeriodStart" TIMESTAMP(3) NOT NULL,
  "dispatchPeriodEnd" TIMESTAMP(3) NOT NULL,
  "dispatchManagerName" TEXT NOT NULL,
  "receivingManagerName" TEXT NOT NULL,
  "socialInsuranceEnrolled" BOOLEAN NOT NULL DEFAULT false,
  "contractCount" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispatchLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DispatchLedger_placementId_key" ON "DispatchLedger"("placementId");
CREATE INDEX "DispatchLedger_applicantId_idx" ON "DispatchLedger"("applicantId");
CREATE INDEX "DispatchLedger_facilityId_idx" ON "DispatchLedger"("facilityId");
CREATE INDEX "DispatchLedger_antiteishokuDate_idx" ON "DispatchLedger"("antiteishokuDate");
ALTER TABLE "DispatchLedger"
  ADD CONSTRAINT "DispatchLedger_placementId_fkey"
  FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DispatchLedger"
  ADD CONSTRAINT "DispatchLedger_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLedger"
  ADD CONSTRAINT "DispatchLedger_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLedger"
  ADD CONSTRAINT "DispatchLedger_jobOrderId_fkey"
  FOREIGN KEY ("jobOrderId") REFERENCES "JobOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========
-- 9) MyNumberRecord: マイナンバー (特定個人情報) — AES-256-GCM 暗号化
-- ==========
CREATE TABLE "MyNumberRecord" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "encryptedNumber" TEXT NOT NULL,
  "encryptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purpose" "MyNumberPurpose" NOT NULL,
  "retentionUntil" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MyNumberRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MyNumberRecord_applicantId_key" ON "MyNumberRecord"("applicantId");
CREATE INDEX "MyNumberRecord_purpose_idx" ON "MyNumberRecord"("purpose");
CREATE INDEX "MyNumberRecord_retentionUntil_idx" ON "MyNumberRecord"("retentionUntil");
CREATE INDEX "MyNumberRecord_deletedAt_idx" ON "MyNumberRecord"("deletedAt");
ALTER TABLE "MyNumberRecord"
  ADD CONSTRAINT "MyNumberRecord_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========
-- 10) MyNumberAccessLog: マイナンバー閲覧/更新/削除/エクスポート ログ
-- ==========
CREATE TABLE "MyNumberAccessLog" (
  "id" TEXT NOT NULL,
  "myNumberRecordId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "action" "MyNumberAccessAction" NOT NULL,
  "reason" TEXT NOT NULL,
  "ipAddress" TEXT,
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MyNumberAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MyNumberAccessLog_myNumberRecordId_idx" ON "MyNumberAccessLog"("myNumberRecordId");
CREATE INDEX "MyNumberAccessLog_staffId_idx" ON "MyNumberAccessLog"("staffId");
CREATE INDEX "MyNumberAccessLog_accessedAt_idx" ON "MyNumberAccessLog"("accessedAt");
ALTER TABLE "MyNumberAccessLog"
  ADD CONSTRAINT "MyNumberAccessLog_myNumberRecordId_fkey"
  FOREIGN KEY ("myNumberRecordId") REFERENCES "MyNumberRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MyNumberAccessLog"
  ADD CONSTRAINT "MyNumberAccessLog_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========
-- 11) AuditEvent: append-only ハッシュチェーン監査ログ
--     hash = sha256(prevHash || canonical(this)) で改ざん検知
-- ==========
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorStaffId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "prevHash" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuditEvent_hash_key" ON "AuditEvent"("hash");
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_actorStaffId_idx" ON "AuditEvent"("actorStaffId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_actorStaffId_fkey"
  FOREIGN KEY ("actorStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
