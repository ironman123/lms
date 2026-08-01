import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    applyMistakeGrade,
    getNextMistakeReviewAt,
    MISTAKE_REPAIR_CORRECT_STREAK,
} from "../lib/mistake-notebook-policy";

test("a first wrong answer creates an active mistake", () => {
    assert.deepEqual(applyMistakeGrade(null, "INCORRECT"), {
        status: "ACTIVE",
        wrongCount: 1,
        correctAfterMistakeCount: 0,
    });
});

test("a correct answer without a previous mistake creates nothing", () => {
    assert.equal(applyMistakeGrade(null, "CORRECT"), null);
});

test("two later correct attempts repair a mistake", () => {
    const mistake = applyMistakeGrade(null, "INCORRECT");
    assert.ok(mistake);
    const once = applyMistakeGrade(mistake, "CORRECT");
    assert.ok(once);
    assert.equal(once.status, "ACTIVE");
    assert.equal(once.correctAfterMistakeCount, 1);
    const repaired = applyMistakeGrade(once, "CORRECT");
    assert.ok(repaired);
    assert.equal(MISTAKE_REPAIR_CORRECT_STREAK, 2);
    assert.equal(repaired.status, "REPAIRED");
});

test("another wrong answer reopens a repaired mistake", () => {
    const reopened = applyMistakeGrade(
        {
            status: "REPAIRED",
            wrongCount: 2,
            correctAfterMistakeCount: 2,
        },
        "INCORRECT"
    );
    assert.deepEqual(reopened, {
        status: "ACTIVE",
        wrongCount: 3,
        correctAfterMistakeCount: 0,
    });
});

test("today repair schedules retries without same-day grinding", () => {
    const occurredAt = new Date("2026-08-01T10:00:00.000Z");
    assert.equal(
        getNextMistakeReviewAt({
            occurredAt,
            grade: "INCORRECT",
            purpose: "DAILY_REPAIR",
            repaired: false,
        })?.toISOString(),
        "2026-08-02T10:00:00.000Z"
    );
    assert.equal(
        getNextMistakeReviewAt({
            occurredAt,
            grade: "CORRECT",
            purpose: "DAILY_REPAIR",
            repaired: false,
        })?.toISOString(),
        "2026-08-04T10:00:00.000Z"
    );
});

test("a repaired question has no next review date", () => {
    assert.equal(
        getNextMistakeReviewAt({
            occurredAt: new Date(),
            grade: "CORRECT",
            purpose: "DAILY_REPAIR",
            repaired: true,
        }),
        null
    );
});

const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260801140000_mistake_notebook/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("mistake notebook migration backfills only completed objective grades", () => {
    assert.match(migration, /session\."status" = 'COMPLETED'/);
    assert.match(migration, /interaction\."grade" IN \('CORRECT', 'INCORRECT'\)/);
    assert.match(migration, /HAVING COUNT\(\*\) FILTER/);
});

test("mistake projection is unique per user and question", () => {
    assert.match(migration, /MistakeNotebookEntry_userId_questionId_key/);
    assert.match(migration, /userId_status_nextReviewAt_idx/);
});

test("session stats projects mistakes before marking the outbox processed", () => {
    const processor = readFileSync(
        new URL("../lib/session-stats.ts", import.meta.url),
        "utf8"
    );
    const projection = processor.indexOf("projectSessionMistakes(");
    const processed = processor.indexOf("processedAt: new Date()");
    assert.ok(projection >= 0);
    assert.ok(processed > projection);
});

test("exam dashboards filter by the frozen session exam id", () => {
    const dashboard = readFileSync(
        new URL(
            "../app/(main)/actions/dashboard-actions.ts",
            import.meta.url
        ),
        "utf8"
    );
    assert.match(dashboard, /status: "COMPLETED",\s+examId,/);
    assert.doesNotMatch(
        dashboard,
        /paper: \{ examQuestionPaperLinks: \{ some: \{ examId \} \} \}/
    );
});

test("repair sessions are bounded and excluded from profile aggregates", () => {
    const action = readFileSync(
        new URL(
            "../app/(main)/actions/repair-actions.ts",
            import.meta.url
        ),
        "utf8"
    );
    const processor = readFileSync(
        new URL("../lib/session-stats.ts", import.meta.url),
        "utf8"
    );
    assert.match(action, /const REPAIR_BATCH_SIZE = 10/);
    assert.match(action, /nextReviewAt: \{ lte: now \}/);
    assert.match(action, /purpose: SessionPurpose\.DAILY_REPAIR/);
    assert.match(
        processor,
        /contribution\.session\.purpose === SessionPurpose\.STANDARD/
    );
});
