CREATE TYPE "MistakeStatus" AS ENUM ('ACTIVE', 'REPAIRED');

CREATE TABLE "MistakeNotebookEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "lastSessionId" TEXT,
    "status" "MistakeStatus" NOT NULL DEFAULT 'ACTIVE',
    "wrongCount" INTEGER NOT NULL DEFAULT 1,
    "correctAfterMistakeCount" INTEGER NOT NULL DEFAULT 0,
    "firstWrongAt" TIMESTAMP(3) NOT NULL,
    "lastWrongAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "nextReviewAt" TIMESTAMP(3),
    "repairedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MistakeNotebookEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MistakeNotebookEntry_userId_questionId_key"
ON "MistakeNotebookEntry"("userId", "questionId");

CREATE INDEX "MistakeNotebookEntry_userId_status_nextReviewAt_idx"
ON "MistakeNotebookEntry"("userId", "status", "nextReviewAt");

CREATE INDEX "MistakeNotebookEntry_userId_updatedAt_idx"
ON "MistakeNotebookEntry"("userId", "updatedAt");

CREATE INDEX "MistakeNotebookEntry_questionId_idx"
ON "MistakeNotebookEntry"("questionId");

CREATE INDEX "MistakeNotebookEntry_lastSessionId_idx"
ON "MistakeNotebookEntry"("lastSessionId");

ALTER TABLE "MistakeNotebookEntry"
ADD CONSTRAINT "MistakeNotebookEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MistakeNotebookEntry"
ADD CONSTRAINT "MistakeNotebookEntry_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MistakeNotebookEntry"
ADD CONSTRAINT "MistakeNotebookEntry_lastSessionId_fkey"
FOREIGN KEY ("lastSessionId") REFERENCES "TestSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Build the initial notebook from final interactions belonging to completed
-- sessions. Two later correct attempts repair an entry; a newer wrong answer
-- reopens it automatically.
WITH ordered_events AS (
    SELECT
        interaction."userId",
        interaction."questionId",
        interaction."sessionId",
        interaction."grade",
        COALESCE(session."completedAt", session."endTime", session."startTime") AS occurred_at,
        ROW_NUMBER() OVER (
            PARTITION BY interaction."userId", interaction."questionId"
            ORDER BY
                COALESCE(session."completedAt", session."endTime", session."startTime") ASC,
                interaction."sessionId" ASC
        ) AS event_order
    FROM "QuestionInteraction" AS interaction
    JOIN "TestSession" AS session
        ON session."id" = interaction."sessionId"
    WHERE session."status" = 'COMPLETED'
      AND interaction."grade" IN ('CORRECT', 'INCORRECT')
),
mistake_summary AS (
    SELECT
        events."userId",
        events."questionId",
        COUNT(*) FILTER (WHERE events."grade" = 'INCORRECT')::INTEGER AS wrong_count,
        MIN(events.occurred_at) FILTER (WHERE events."grade" = 'INCORRECT') AS first_wrong_at,
        MAX(events.occurred_at) FILTER (WHERE events."grade" = 'INCORRECT') AS last_wrong_at,
        MAX(events.event_order) FILTER (WHERE events."grade" = 'INCORRECT') AS last_wrong_order,
        MAX(events.occurred_at) AS last_reviewed_at,
        (ARRAY_AGG(events."sessionId" ORDER BY events.event_order DESC))[1] AS last_session_id
    FROM ordered_events AS events
    GROUP BY events."userId", events."questionId"
    HAVING COUNT(*) FILTER (WHERE events."grade" = 'INCORRECT') > 0
),
repair_state AS (
    SELECT
        summary.*,
        COUNT(events.*) FILTER (
            WHERE events."grade" = 'CORRECT'
              AND events.event_order > summary.last_wrong_order
        )::INTEGER AS correct_after_mistake
    FROM mistake_summary AS summary
    LEFT JOIN ordered_events AS events
        ON events."userId" = summary."userId"
       AND events."questionId" = summary."questionId"
    GROUP BY
        summary."userId",
        summary."questionId",
        summary.wrong_count,
        summary.first_wrong_at,
        summary.last_wrong_at,
        summary.last_wrong_order,
        summary.last_reviewed_at,
        summary.last_session_id
)
INSERT INTO "MistakeNotebookEntry" (
    "id",
    "userId",
    "questionId",
    "lastSessionId",
    "status",
    "wrongCount",
    "correctAfterMistakeCount",
    "firstWrongAt",
    "lastWrongAt",
    "lastReviewedAt",
    "nextReviewAt",
    "repairedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'mistake-' || md5(state."userId" || ':' || state."questionId"),
    state."userId",
    state."questionId",
    state.last_session_id,
    CASE
        WHEN state.correct_after_mistake >= 2 THEN 'REPAIRED'::"MistakeStatus"
        ELSE 'ACTIVE'::"MistakeStatus"
    END,
    state.wrong_count,
    state.correct_after_mistake,
    state.first_wrong_at,
    state.last_wrong_at,
    state.last_reviewed_at,
    CASE WHEN state.correct_after_mistake >= 2 THEN NULL ELSE state.last_wrong_at END,
    CASE WHEN state.correct_after_mistake >= 2 THEN state.last_reviewed_at ELSE NULL END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM repair_state AS state;
