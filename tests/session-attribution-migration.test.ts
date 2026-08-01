import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260801120000_session_exam_attribution/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("historical attribution only infers papers with exactly one exam", () => {
    assert.match(migration, /WHEN counts\."examCount" = 1/);
    assert.match(migration, /HISTORICAL_BACKFILL/);
    assert.match(migration, /STANDALONE/);
    assert.match(migration, /UNCLASSIFIED/);
});

test("analytics contribution attribution comes from its immutable session", () => {
    assert.match(migration, /SET "examId" = session\."examId"/);
    assert.match(migration, /contribution\."examId" IS DISTINCT FROM session\."examId"/);
});

test("exam performance is rebuilt from processed durable contributions", () => {
    assert.match(migration, /DELETE FROM "UserExamStats"/);
    assert.match(migration, /"processedAt" IS NOT NULL/);
    assert.match(migration, /ROW_NUMBER\(\) OVER/);
    assert.match(migration, /INSERT INTO "UserExamStats"/);
});
