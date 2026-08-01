ALTER TYPE "AppFeedbackStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED' AFTER 'NEW';

ALTER TABLE "AppFeedback"
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "acknowledgedById" TEXT;

CREATE INDEX "AppFeedback_acknowledgedById_acknowledgedAt_idx"
ON "AppFeedback"("acknowledgedById", "acknowledgedAt");

ALTER TABLE "AppFeedback"
ADD CONSTRAINT "AppFeedback_acknowledgedById_fkey"
FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Tickets already being worked on were necessarily seen by the team.
UPDATE "AppFeedback"
SET "acknowledgedAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" IN ('IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED')
  AND "acknowledgedAt" IS NULL;
