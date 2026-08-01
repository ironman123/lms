import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260801090000_paper_authoring_and_app_feedback/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("paper authoring migration backfills and constrains question order", () => {
    assert.match(migration, /ROW_NUMBER\(\) OVER/);
    assert.match(migration, /ALTER COLUMN "position" SET NOT NULL/);
    assert.match(migration, /Question_paperId_position_key/);
});

test("paper imports are idempotent per paper", () => {
    assert.match(migration, /PaperImport_paperId_idempotencyKey_key/);
    assert.match(migration, /Question_importId_fkey/);
});

test("app feedback has reporter and assignee integrity", () => {
    assert.match(migration, /AppFeedback_reporterId_fkey/);
    assert.match(migration, /ON DELETE RESTRICT/);
    assert.match(migration, /AppFeedback_assignedToId_fkey/);
});
