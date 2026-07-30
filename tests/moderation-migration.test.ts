import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260731090000_add_content_moderation/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("moderation migration records content revisions for both target types", () => {
    assert.match(
        migration,
        /ALTER TABLE "Question"\s+ADD COLUMN "contentRevision"/
    );
    assert.match(
        migration,
        /ALTER TABLE "QuestionPaper"\s+ADD COLUMN "contentRevision"/
    );
    assert.match(migration, /"questionRevision" INTEGER/);
    assert.match(migration, /"paperRevision" INTEGER/);
    assert.match(migration, /"snapshotHash" TEXT/);
});

test("moderation migration enforces one target and one user count per case", () => {
    assert.match(migration, /ModerationCase_exactly_one_target/);
    assert.match(
        migration,
        /ContentReport_caseId_reporterId_key/
    );
    assert.match(
        migration,
        /CREATE UNIQUE INDEX "ModerationCase_activeKey_key"/
    );
});

test("moderation audit records cannot disappear with their actor", () => {
    assert.match(
        migration,
        /ModerationConfigAudit_actorId_fkey"[\s\S]*ON DELETE RESTRICT/
    );
    assert.match(
        migration,
        /ContentReport_reporterId_fkey"[\s\S]*ON DELETE RESTRICT/
    );
});

test("default moderation configuration is seeded idempotently", () => {
    assert.match(
        migration,
        /INSERT INTO "ModerationConfig"[\s\S]*ON CONFLICT \("id"\) DO NOTHING/
    );
});
