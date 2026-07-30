CREATE TYPE "InteractionGrade" AS ENUM (
    'CORRECT',
    'INCORRECT',
    'SKIPPED',
    'PENDING',
    'UNAVAILABLE'
);

ALTER TABLE "QuestionInteraction"
    ADD COLUMN "grade" "InteractionGrade" NOT NULL DEFAULT 'SKIPPED',
    ADD COLUMN "questionPosition" INTEGER,
    ADD COLUMN "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "penaltyApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "questionSnapshot" JSONB;

ALTER TABLE "TestSession"
    ADD COLUMN "earnedMarks" DOUBLE PRECISION,
    ADD COLUMN "maximumMarks" DOUBLE PRECISION,
    ADD COLUMN "penaltyMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "pendingReviewCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "pausedDurationSecs" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "QuestionInteraction_sessionId_questionPosition_idx"
    ON "QuestionInteraction"("sessionId", "questionPosition");
