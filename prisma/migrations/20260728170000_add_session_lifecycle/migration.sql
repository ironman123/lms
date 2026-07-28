CREATE TYPE "SessionStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ABANDONED',
    'EXPIRED',
    'INVALIDATED'
);

ALTER TABLE "TestSession"
ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "lastCheckpointAt" TIMESTAMP(3),
ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "abandonedAt" TIMESTAMP(3),
ADD COLUMN "abandonReason" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "TestSession"
SET "status" = 'COMPLETED'
WHERE "endTime" IS NOT NULL;

UPDATE "TestSession"
SET "expiresAt" = CASE
    WHEN "mode" = 'MOCK' THEN
        "startTime" + make_interval(
            mins => COALESCE(
                (
                    SELECT exam."duration"
                    FROM "ExamQuestionPaperLink" AS link
                    JOIN "Exam" AS exam ON exam."id" = link."examId"
                    WHERE link."paperId" = "TestSession"."paperId"
                    ORDER BY link."createdAt" ASC
                    LIMIT 1
                ),
                60
            )
        )
    ELSE "startTime" + INTERVAL '72 hours'
END
WHERE "status" = 'ACTIVE';

WITH ranked_open_sessions AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "userId", "paperId", "mode"
            ORDER BY "startTime" DESC
        ) AS row_number
    FROM "TestSession"
    WHERE "status" IN ('ACTIVE', 'PAUSED')
)
UPDATE "TestSession" AS session
SET
    "status" = 'ABANDONED',
    "abandonedAt" = CURRENT_TIMESTAMP,
    "abandonReason" = 'Superseded during session lifecycle migration'
FROM ranked_open_sessions AS ranked
WHERE session."id" = ranked."id"
  AND ranked.row_number > 1;

CREATE INDEX "TestSession_userId_status_startTime_idx"
ON "TestSession"("userId", "status", "startTime");

CREATE INDEX "TestSession_status_expiresAt_idx"
ON "TestSession"("status", "expiresAt");

CREATE INDEX "TestSession_paperId_status_idx"
ON "TestSession"("paperId", "status");

CREATE INDEX "TestSession_userId_completedAt_idx"
ON "TestSession"("userId", "completedAt");

CREATE UNIQUE INDEX "TestSession_one_resumable_per_user_paper_mode"
ON "TestSession"("userId", "paperId", "mode")
WHERE "status" IN ('ACTIVE', 'PAUSED');
