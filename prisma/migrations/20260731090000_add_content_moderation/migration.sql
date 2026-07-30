-- Add immutable content revisions before reports can point at exact question versions.
ALTER TABLE "Question"
ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "QuestionPaper"
ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archiveReason" TEXT;

CREATE TYPE "ModerationTargetType" AS ENUM ('QUESTION', 'PAPER');
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ReportCategory" AS ENUM (
    'WRONG_ANSWER_KEY',
    'AMBIGUOUS_QUESTION',
    'INVALID_OPTIONS',
    'TYPO_OR_FORMATTING',
    'INCORRECT_EXPLANATION',
    'MISSING_OR_BROKEN_IMAGE',
    'TRANSLATION_ISSUE',
    'OUT_OF_SYLLABUS',
    'DUPLICATE_QUESTION',
    'WRONG_PAPER_DETAILS',
    'INCOMPLETE_PAPER',
    'OTHER'
);
CREATE TYPE "ReportSource" AS ENUM ('ACTIVE_SESSION', 'RESULT_REVIEW', 'PAPER_PAGE');
CREATE TYPE "ModerationActionType" AS ENUM (
    'CREATED',
    'ESCALATED',
    'ASSIGNED',
    'MARKED_IN_REVIEW',
    'RESOLVED',
    'DISMISSED',
    'REOPENED',
    'COMMENTED',
    'CONTENT_EDITED',
    'CONTENT_ARCHIVED',
    'REPORT_WITHDRAWN',
    'REPORT_RESTORED',
    'MERGED'
);

CREATE TABLE "ModerationConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "questionReportThreshold" INTEGER NOT NULL DEFAULT 3,
    "paperReportThreshold" INTEGER NOT NULL DEFAULT 3,
    "reportLimitPerHour" INTEGER NOT NULL DEFAULT 10,
    "reportLimitPerDay" INTEGER NOT NULL DEFAULT 30,
    "maxCommentLength" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "ModerationConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModerationConfig_positive_values" CHECK (
        "questionReportThreshold" > 0
        AND "paperReportThreshold" > 0
        AND "reportLimitPerHour" > 0
        AND "reportLimitPerDay" > 0
        AND "maxCommentLength" BETWEEN 1 AND 5000
    )
);

CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "questionId" TEXT,
    "paperId" TEXT,
    "questionRevision" INTEGER,
    "paperRevision" INTEGER,
    "snapshotHash" TEXT,
    "targetSnapshot" JSONB,
    "activeKey" TEXT,
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "uniqueReporterCount" INTEGER NOT NULL DEFAULT 0,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModerationCase_nonnegative_reporters" CHECK ("uniqueReporterCount" >= 0),
    CONSTRAINT "ModerationCase_exactly_one_target" CHECK (
        (
            "targetType" = 'QUESTION'
            AND "questionId" IS NOT NULL
            AND "paperId" IS NULL
            AND "questionRevision" IS NOT NULL
            AND "paperRevision" IS NULL
            AND "snapshotHash" IS NOT NULL
        )
        OR
        (
            "targetType" = 'PAPER'
            AND "questionId" IS NULL
            AND "paperId" IS NOT NULL
            AND "questionRevision" IS NULL
            AND "paperRevision" IS NOT NULL
            AND "snapshotHash" IS NOT NULL
        )
    )
);

CREATE TABLE "ModerationConfigAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationConfigAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "sessionId" TEXT,
    "category" "ReportCategory" NOT NULL,
    "source" "ReportSource" NOT NULL,
    "comment" TEXT,
    "context" JSONB,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "ModerationActionType" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModerationCase_activeKey_key" ON "ModerationCase"("activeKey");
CREATE INDEX "ModerationCase_status_isEscalated_updatedAt_idx" ON "ModerationCase"("status", "isEscalated", "updatedAt");
CREATE INDEX "ModerationCase_questionId_questionRevision_idx" ON "ModerationCase"("questionId", "questionRevision");
CREATE INDEX "ModerationCase_paperId_status_idx" ON "ModerationCase"("paperId", "status");
CREATE INDEX "ModerationCase_assignedToId_status_idx" ON "ModerationCase"("assignedToId", "status");
CREATE INDEX "ModerationConfigAudit_createdAt_idx" ON "ModerationConfigAudit"("createdAt");
CREATE INDEX "ModerationConfigAudit_actorId_createdAt_idx" ON "ModerationConfigAudit"("actorId", "createdAt");
CREATE UNIQUE INDEX "ContentReport_caseId_reporterId_key" ON "ContentReport"("caseId", "reporterId");
CREATE INDEX "ContentReport_reporterId_createdAt_idx" ON "ContentReport"("reporterId", "createdAt");
CREATE INDEX "ContentReport_caseId_category_idx" ON "ContentReport"("caseId", "category");
CREATE INDEX "ContentReport_sessionId_idx" ON "ContentReport"("sessionId");
CREATE INDEX "ModerationAction_caseId_createdAt_idx" ON "ModerationAction"("caseId", "createdAt");
CREATE INDEX "ModerationAction_actorId_createdAt_idx" ON "ModerationAction"("actorId", "createdAt");

ALTER TABLE "ModerationConfig"
ADD CONSTRAINT "ModerationConfig_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationCase"
ADD CONSTRAINT "ModerationCase_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModerationCase"
ADD CONSTRAINT "ModerationCase_paperId_fkey"
FOREIGN KEY ("paperId") REFERENCES "QuestionPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModerationCase"
ADD CONSTRAINT "ModerationCase_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationConfigAudit"
ADD CONSTRAINT "ModerationConfigAudit_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
ADD CONSTRAINT "ContentReport_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
ADD CONSTRAINT "ContentReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
ADD CONSTRAINT "ContentReport_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAction"
ADD CONSTRAINT "ModerationAction_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ModerationConfig" ("id", "updatedAt")
VALUES ('global', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
