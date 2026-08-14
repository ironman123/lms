-- Existing sent notifications predate the outbox. They must remain visible and
-- must never be picked up as new queued broadcasts after this deployment.
UPDATE "Notification"
SET "status" = 'COMPLETED'
WHERE "sentAt" IS NOT NULL
  AND "status" = 'QUEUED';
