CREATE TABLE "UserNotificationPreference" (
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "examUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "practiceUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "UserQuestionBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserQuestionBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserQuestionBookmark_userId_questionId_key" ON "UserQuestionBookmark"("userId", "questionId");
CREATE INDEX "UserQuestionBookmark_userId_updatedAt_idx" ON "UserQuestionBookmark"("userId", "updatedAt");
CREATE INDEX "UserQuestionBookmark_questionId_idx" ON "UserQuestionBookmark"("questionId");

ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserQuestionBookmark" ADD CONSTRAINT "UserQuestionBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserQuestionBookmark" ADD CONSTRAINT "UserQuestionBookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
