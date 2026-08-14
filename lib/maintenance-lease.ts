import "server-only";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Uses a database lease rather than process memory because cron invocations can
 * overlap across serverless instances. Expiry makes a crashed invocation safe.
 */
export async function acquireMaintenanceLease(
    key: string,
    durationMs = 15 * 60_000
) {
    const holderId = randomUUID();
    const lockedUntil = new Date(Date.now() + durationMs);
    const rows = await prisma.$queryRaw<Array<{ key: string }>>(Prisma.sql`
        INSERT INTO "MaintenanceLease" ("key", "holderId", "lockedUntil", "updatedAt")
        VALUES (${key}, ${holderId}, ${lockedUntil}, NOW())
        ON CONFLICT ("key") DO UPDATE SET
            "holderId" = EXCLUDED."holderId",
            "lockedUntil" = EXCLUDED."lockedUntil",
            "updatedAt" = NOW()
        WHERE "MaintenanceLease"."lockedUntil" <= NOW()
        RETURNING "key"
    `);
    return rows.length === 1 ? holderId : null;
}

export async function releaseMaintenanceLease(key: string, holderId: string) {
    await prisma.maintenanceLease.deleteMany({ where: { key, holderId } });
}
