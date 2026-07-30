ALTER TABLE "Question"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Question_paperId_isArchived_idx"
ON "Question"("paperId", "isArchived");

CREATE TABLE "SessionStatsContribution" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "SessionStatsContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionStatsContribution_sessionId_key"
ON "SessionStatsContribution"("sessionId");

CREATE INDEX "SessionStatsContribution_processedAt_createdAt_idx"
ON "SessionStatsContribution"("processedAt", "createdAt");

CREATE INDEX "SessionStatsContribution_userId_processedAt_idx"
ON "SessionStatsContribution"("userId", "processedAt");

CREATE INDEX "SessionStatsContribution_userId_examId_processedAt_idx"
ON "SessionStatsContribution"("userId", "examId", "processedAt");

ALTER TABLE "SessionStatsContribution"
ADD CONSTRAINT "SessionStatsContribution_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionStatsContribution"
ADD CONSTRAINT "SessionStatsContribution_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionStatsContribution"
ADD CONSTRAINT "SessionStatsContribution_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
