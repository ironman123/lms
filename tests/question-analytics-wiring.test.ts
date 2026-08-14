import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

test("durable question analytics is projected on submit, retry, and before retention", () => {
    const submission = read("app", "(main)", "actions", "session-actions.ts");
    const retry = read("app", "api", "queues", "session-stats", "route.ts");
    const retention = read("lib", "interaction-retention.ts");
    assert.match(submission, /processSessionQuestionAnalytics\(sessionId\)/);
    assert.match(retry, /processSessionQuestionAnalytics\(parsed\.data\.sessionId\)/);
    assert.match(
        retention,
        /questionAnalyticsContribution[\s\S]*processedAt/
    );
});

test("durable analytics migration uses a unique session contribution and daily keys", () => {
    const migration = read(
        "prisma",
        "migrations",
        "20260814150000_durable_question_analytics",
        "migration.sql"
    );
    assert.match(migration, /QuestionAnalyticsContribution_sessionId_key/);
    assert.match(migration, /QuestionAnalyticsDaily_questionId_day_key/);
    assert.match(migration, /QuestionOptionAnalyticsDaily_dailyId_selectedAnswer_key/);
    assert.match(migration, /QuestionConfidenceAnalyticsDaily_dailyId_confidenceLevel_key/);
});
