CREATE TYPE "SessionPurpose" AS ENUM ('STANDARD', 'DAILY_REPAIR');

ALTER TABLE "TestSession"
ADD COLUMN "purpose" "SessionPurpose" NOT NULL DEFAULT 'STANDARD';

CREATE INDEX "TestSession_userId_purpose_status_startTime_idx"
ON "TestSession"("userId", "purpose", "status", "startTime");
