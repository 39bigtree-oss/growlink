-- Phase 3: AI 電話面接 + ジョブキュー (BullMQ / インメモリ)
-- Interview 拡張 + InterviewTurn / InterviewToken / JobLog を新設。

-- ---------------------------
-- Interview に列追加
-- ---------------------------
ALTER TABLE "Interview"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN "turnCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "channel" TEXT,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ja',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------
-- InterviewTurn
-- ---------------------------
CREATE TABLE "InterviewTurn" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "turnIndex" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "audioKey" TEXT,
  "provider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewTurn_interviewId_turnIndex_key" ON "InterviewTurn"("interviewId", "turnIndex");
CREATE INDEX "InterviewTurn_interviewId_idx" ON "InterviewTurn"("interviewId");

ALTER TABLE "InterviewTurn"
  ADD CONSTRAINT "InterviewTurn_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------
-- InterviewToken
-- ---------------------------
CREATE TABLE "InterviewToken" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewToken_token_key" ON "InterviewToken"("token");
CREATE INDEX "InterviewToken_interviewId_idx" ON "InterviewToken"("interviewId");
CREATE INDEX "InterviewToken_expiresAt_idx" ON "InterviewToken"("expiresAt");

ALTER TABLE "InterviewToken"
  ADD CONSTRAINT "InterviewToken_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------
-- JobLog (BullMQ / memory)
-- ---------------------------
CREATE TABLE "JobLog" (
  "id" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "target" TEXT,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobLog_queue_status_idx" ON "JobLog"("queue", "status");
CREATE INDEX "JobLog_target_idx" ON "JobLog"("target");
CREATE INDEX "JobLog_createdAt_idx" ON "JobLog"("createdAt");
