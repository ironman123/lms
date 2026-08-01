-- Freeze the exam context on each session. This prevents later paper-link
-- edits from changing which exam receives the historical score.
CREATE TYPE "SessionExamContextSource" AS ENUM (
    'EXPLICIT_SELECTION',
    'AUTO_SINGLE_LINK',
    'STANDALONE',
    'HISTORICAL_BACKFILL',
    'UNCLASSIFIED'
);

ALTER TABLE "TestSession"
ADD COLUMN "examId" TEXT,
ADD COLUMN "examContextSource" "SessionExamContextSource" NOT NULL DEFAULT 'UNCLASSIFIED';

-- Historical attribution is intentionally conservative:
--   one current link -> safely infer that exam
--   no links          -> standalone paper
--   multiple links    -> leave unclassified for manual review
WITH paper_exam_counts AS (
    SELECT
        paper."id" AS "paperId",
        COUNT(link."examId")::INTEGER AS "examCount",
        MIN(link."examId") AS "singleExamId"
    FROM "QuestionPaper" AS paper
    LEFT JOIN "ExamQuestionPaperLink" AS link
        ON link."paperId" = paper."id"
    GROUP BY paper."id"
)
UPDATE "TestSession" AS session
SET
    "examId" = CASE
        WHEN counts."examCount" = 1 THEN counts."singleExamId"
        ELSE NULL
    END,
    "examContextSource" = CASE
        WHEN counts."examCount" = 1
            THEN 'HISTORICAL_BACKFILL'::"SessionExamContextSource"
        WHEN counts."examCount" = 0
            THEN 'STANDALONE'::"SessionExamContextSource"
        ELSE 'UNCLASSIFIED'::"SessionExamContextSource"
    END
FROM paper_exam_counts AS counts
WHERE counts."paperId" = session."paperId";

CREATE INDEX "TestSession_userId_examId_completedAt_idx"
ON "TestSession"("userId", "examId", "completedAt");

ALTER TABLE "TestSession"
ADD CONSTRAINT "TestSession_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- SessionStatsContribution is the durable analytics outbox. Re-key every
-- contribution from its session, including clearing old first-link guesses
-- for multi-exam or standalone papers.
UPDATE "SessionStatsContribution" AS contribution
SET "examId" = session."examId"
FROM "TestSession" AS session
WHERE session."id" = contribution."sessionId"
  AND contribution."examId" IS DISTINCT FROM session."examId";

-- UserExamStats is a derived projection. Rebuild it from processed durable
-- contributions so deploying this migration is safe to repeat from a clean
-- database and does not preserve already-misattributed totals.
DELETE FROM "UserExamStats";

WITH scored AS (
    SELECT
        contribution."userId",
        contribution."examId",
        contribution."id",
        contribution."createdAt",
        (contribution."payload"->>'sessionScore')::DOUBLE PRECISION AS score
    FROM "SessionStatsContribution" AS contribution
    WHERE contribution."processedAt" IS NOT NULL
      AND contribution."examId" IS NOT NULL
      AND contribution."payload" ? 'sessionScore'
),
ranked AS (
    SELECT
        scored.*,
        ROW_NUMBER() OVER (
            PARTITION BY scored."userId", scored."examId"
            ORDER BY scored."createdAt" DESC, scored."id" DESC
        ) AS newest_rank
    FROM scored
),
aggregated AS (
    SELECT
        ranked."userId",
        ranked."examId",
        COUNT(*)::INTEGER AS "testsAttempted",
        SUM(ranked.score)::DOUBLE PRECISION AS "scoreSum",
        GREATEST(0, MAX(ranked.score))::DOUBLE PRECISION AS "bestScore",
        MAX(CASE WHEN ranked.newest_rank = 1 THEN ranked.score END)::DOUBLE PRECISION AS "lastScore",
        MAX(CASE WHEN ranked.newest_rank = 2 THEN ranked.score END)::DOUBLE PRECISION AS "prevScore"
    FROM ranked
    GROUP BY ranked."userId", ranked."examId"
)
INSERT INTO "UserExamStats" (
    "id",
    "userId",
    "examId",
    "testsAttempted",
    "scoreSum",
    "bestScore",
    "lastScore",
    "prevScore",
    "updatedAt"
)
SELECT
    'session-exam-' || md5(aggregated."userId" || ':' || aggregated."examId"),
    aggregated."userId",
    aggregated."examId",
    aggregated."testsAttempted",
    aggregated."scoreSum",
    aggregated."bestScore",
    aggregated."lastScore",
    aggregated."prevScore",
    CURRENT_TIMESTAMP
FROM aggregated;
