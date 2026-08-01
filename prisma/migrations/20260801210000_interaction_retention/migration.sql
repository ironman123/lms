ALTER TABLE "TestSession"
ADD COLUMN "interactionArchive" JSONB,
ADD COLUMN "interactionsPurgedAt" TIMESTAMP(3);

CREATE INDEX "TestSession_status_interactionsPurgedAt_completedAt_idx"
ON "TestSession"("status", "interactionsPurgedAt", "completedAt");

CREATE TABLE "InteractionRetentionConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 180,
    "maxDetailedSessionsPerUser" INTEGER NOT NULL DEFAULT 50,
    "batchSize" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    CONSTRAINT "InteractionRetentionConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InteractionRetentionConfig_valid_limits" CHECK (
        "retentionDays" BETWEEN 30 AND 3650
        AND "maxDetailedSessionsPerUser" BETWEEN 5 AND 1000
        AND "batchSize" BETWEEN 1 AND 200
    )
);

CREATE INDEX "InteractionRetentionConfig_updatedById_idx"
ON "InteractionRetentionConfig"("updatedById");

ALTER TABLE "InteractionRetentionConfig"
ADD CONSTRAINT "InteractionRetentionConfig_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "InteractionRetentionConfig" ("id", "updatedAt")
VALUES ('global', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "UserInteractionArchiveStats" (
    "userId" TEXT NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "confidenceBuckets" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInteractionArchiveStats_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserInteractionArchiveStats"
ADD CONSTRAINT "UserInteractionArchiveStats_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InteractionRetentionRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "examinedSessions" INTEGER NOT NULL DEFAULT 0,
    "archivedSessions" INTEGER NOT NULL DEFAULT 0,
    "deletedInteractions" INTEGER NOT NULL DEFAULT 0,
    "skippedSessions" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "InteractionRetentionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InteractionRetentionRun_startedAt_idx"
ON "InteractionRetentionRun"("startedAt");
