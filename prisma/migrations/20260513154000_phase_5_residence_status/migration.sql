-- Phase 5: 在留資格を分離テーブルとして追加。
-- Applicant に直接列を増やさず別エンティティにし、権限を絞りやすくする。

CREATE TABLE "ResidenceStatus" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "visaType" TEXT NOT NULL,
  "visaNumber" TEXT,
  "expireAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResidenceStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResidenceStatus_applicantId_key" ON "ResidenceStatus"("applicantId");
CREATE INDEX "ResidenceStatus_visaType_idx" ON "ResidenceStatus"("visaType");
CREATE INDEX "ResidenceStatus_expireAt_idx" ON "ResidenceStatus"("expireAt");

ALTER TABLE "ResidenceStatus"
  ADD CONSTRAINT "ResidenceStatus_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
