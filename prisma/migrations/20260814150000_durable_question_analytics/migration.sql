CREATE TABLE "QuestionAnalyticsContribution" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    CONSTRAINT "QuestionAnalyticsContribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "unavailableCount" INTEGER NOT NULL DEFAULT 0,
    "totalDwellSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionAnalyticsBackfillRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "examinedSessions" INTEGER NOT NULL DEFAULT 0,
    "projectedSessions" INTEGER NOT NULL DEFAULT 0,
    "skippedSessions" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "QuestionAnalyticsBackfillRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionOptionAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "dailyId" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "selectionCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuestionOptionAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionConfidenceAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "dailyId" TEXT NOT NULL,
    "confidenceLevel" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuestionConfidenceAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionAnalyticsContribution_sessionId_key" ON "QuestionAnalyticsContribution"("sessionId");
CREATE INDEX "QuestionAnalyticsContribution_processedAt_createdAt_idx" ON "QuestionAnalyticsContribution"("processedAt", "createdAt");
CREATE UNIQUE INDEX "QuestionAnalyticsDaily_questionId_day_key" ON "QuestionAnalyticsDaily"("questionId", "day");
CREATE INDEX "QuestionAnalyticsDaily_day_idx" ON "QuestionAnalyticsDaily"("day");
CREATE INDEX "QuestionAnalyticsBackfillRun_startedAt_idx" ON "QuestionAnalyticsBackfillRun"("startedAt");
CREATE UNIQUE INDEX "QuestionOptionAnalyticsDaily_dailyId_selectedAnswer_key" ON "QuestionOptionAnalyticsDaily"("dailyId", "selectedAnswer");
CREATE INDEX "QuestionOptionAnalyticsDaily_dailyId_idx" ON "QuestionOptionAnalyticsDaily"("dailyId");
CREATE UNIQUE INDEX "QuestionConfidenceAnalyticsDaily_dailyId_confidenceLevel_key" ON "QuestionConfidenceAnalyticsDaily"("dailyId", "confidenceLevel");
CREATE INDEX "QuestionConfidenceAnalyticsDaily_dailyId_idx" ON "QuestionConfidenceAnalyticsDaily"("dailyId");

ALTER TABLE "QuestionAnalyticsContribution" ADD CONSTRAINT "QuestionAnalyticsContribution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAnalyticsDaily" ADD CONSTRAINT "QuestionAnalyticsDaily_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionOptionAnalyticsDaily" ADD CONSTRAINT "QuestionOptionAnalyticsDaily_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "QuestionAnalyticsDaily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionConfidenceAnalyticsDaily" ADD CONSTRAINT "QuestionConfidenceAnalyticsDaily_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "QuestionAnalyticsDaily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
