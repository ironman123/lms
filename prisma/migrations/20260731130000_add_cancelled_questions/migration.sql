ALTER TABLE "Question"
ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Question_paperId_isArchived_isCancelled_idx"
ON "Question"("paperId", "isArchived", "isCancelled");
