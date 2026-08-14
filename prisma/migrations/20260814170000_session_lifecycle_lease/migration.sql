CREATE TABLE "MaintenanceLease" (
    "key" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceLease_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "MaintenanceLease_lockedUntil_idx"
ON "MaintenanceLease"("lockedUntil");
