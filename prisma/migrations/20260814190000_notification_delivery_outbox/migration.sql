CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'RETRYABLE', 'FAILED', 'EXPIRED');

ALTER TABLE "Notification"
ADD COLUMN "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED';

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_subscriptionId_key" ON "NotificationDelivery"("notificationId", "subscriptionId");
CREATE INDEX "NotificationDelivery_notificationId_status_createdAt_idx" ON "NotificationDelivery"("notificationId", "status", "createdAt");
CREATE INDEX "NotificationDelivery_status_updatedAt_idx" ON "NotificationDelivery"("status", "updatedAt");
CREATE INDEX "NotificationDelivery_subscriptionId_idx" ON "NotificationDelivery"("subscriptionId");
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
