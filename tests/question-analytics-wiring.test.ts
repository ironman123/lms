import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

test("durable question analytics is projected on submit, retry, and before retention", () => {
    const submission = read("app", "(main)", "actions", "session-actions.ts");
    const retry = read("app", "api", "queues", "session-stats", "route.ts");
    const retention = read("lib", "interaction-retention.ts");
    assert.match(submission, /processSessionQuestionAnalytics\(sessionId\)/);
    assert.match(retry, /processSessionQuestionAnalytics\(parsed\.data\.sessionId\)/);
    const cron = read("app", "api", "cron", "session-stats", "route.ts");
    assert.match(cron, /reconcilePendingQuestionAnalytics/);
    assert.match(
        retention,
        /questionAnalyticsContribution[\s\S]*processedAt/
    );
});

test("scheduled lifecycle reconciles both projections behind a database lease", () => {
    const cron = read("app", "api", "cron", "session-stats", "route.ts");
    const analytics = read("lib", "question-analytics.ts");
    const lease = read("lib", "maintenance-lease.ts");
    assert.match(analytics, /reconcilePendingQuestionAnalytics/);
    assert.match(cron, /acquireMaintenanceLease\("session-lifecycle"\)/);
    assert.match(cron, /skipped_after_projection_failure/);
    assert.match(lease, /ON CONFLICT \("key"\) DO UPDATE/);
    assert.ok(existsSync(join(root, "prisma", "migrations", "20260814170000_session_lifecycle_lease", "migration.sql")));
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
