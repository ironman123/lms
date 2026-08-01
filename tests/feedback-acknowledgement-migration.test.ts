import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260801190000_feedback_acknowledgement/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("feedback acknowledgement records status, time, and actor", () => {
    assert.match(migration, /ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED'/);
    assert.match(migration, /ADD COLUMN "acknowledgedAt" TIMESTAMP\(3\)/);
    assert.match(migration, /ADD COLUMN "acknowledgedById" TEXT/);
    assert.match(migration, /AppFeedback_acknowledgedById_fkey/);
});

test("existing worked tickets are backfilled as acknowledged", () => {
    assert.match(
        migration,
        /WHERE "status" IN \('IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED'\)/
    );
});
