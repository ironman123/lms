CREATE TYPE "PaperStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "PaperImportSource" AS ENUM ('JSON', 'OCR', 'MANUAL');
CREATE TYPE "PaperImportStatus" AS ENUM ('COMMITTED', 'FAILED');
CREATE TYPE "AppFeedbackCategory" AS ENUM ('BUG', 'UX', 'FEATURE_REQUEST', 'PERFORMANCE', 'ACCESSIBILITY', 'GENERAL');
CREATE TYPE "AppFeedbackStatus" AS ENUM ('NEW', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED');
CREATE TYPE "AppFeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

ALTER TABLE "QuestionPaper"
ADD COLUMN "status" "PaperStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Question"
ADD COLUMN "position" INTEGER,
ADD COLUMN "sourceNumber" INTEGER,
ADD COLUMN "syllabusEntryId" TEXT,
ADD COLUMN "importId" TEXT;

WITH ranked_questions AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "paperId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) - 1 AS "resolvedPosition"
    FROM "Question"
)
UPDATE "Question" AS question
SET "position" = ranked_questions."resolvedPosition"
FROM ranked_questions
WHERE question."id" = ranked_questions."id";

ALTER TABLE "Question"
ALTER COLUMN "position" SET NOT NULL;

CREATE TABLE "PaperImport" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "source" "PaperImportSource" NOT NULL,
    "status" "PaperImportStatus" NOT NULL DEFAULT 'COMMITTED',
    "idempotencyKey" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "sourceHash" TEXT,
    "questionCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "PaperImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppFeedback" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "category" "AppFeedbackCategory" NOT NULL,
    "status" "AppFeedbackStatus" NOT NULL DEFAULT 'NEW',
    "priority" "AppFeedbackPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "context" JSONB,
    "adminResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Question_paperId_position_key"
ON "Question"("paperId", "position");

CREATE INDEX "Question_syllabusEntryId_idx"
ON "Question"("syllabusEntryId");

CREATE INDEX "Question_importId_idx"
ON "Question"("importId");

CREATE UNIQUE INDEX "PaperImport_paperId_idempotencyKey_key"
ON "PaperImport"("paperId", "idempotencyKey");

CREATE INDEX "PaperImport_paperId_createdAt_idx"
ON "PaperImport"("paperId", "createdAt");

CREATE INDEX "PaperImport_createdById_createdAt_idx"
ON "PaperImport"("createdById", "createdAt");

CREATE INDEX "AppFeedback_status_priority_updatedAt_idx"
ON "AppFeedback"("status", "priority", "updatedAt");

CREATE INDEX "AppFeedback_reporterId_createdAt_idx"
ON "AppFeedback"("reporterId", "createdAt");

CREATE INDEX "AppFeedback_assignedToId_status_idx"
ON "AppFeedback"("assignedToId", "status");

ALTER TABLE "Question"
ADD CONSTRAINT "Question_syllabusEntryId_fkey"
FOREIGN KEY ("syllabusEntryId") REFERENCES "ExamSyllabusEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Question"
ADD CONSTRAINT "Question_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "PaperImport"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaperImport"
ADD CONSTRAINT "PaperImport_paperId_fkey"
FOREIGN KEY ("paperId") REFERENCES "QuestionPaper"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaperImport"
ADD CONSTRAINT "PaperImport_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppFeedback"
ADD CONSTRAINT "AppFeedback_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppFeedback"
ADD CONSTRAINT "AppFeedback_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
