import assert from "node:assert/strict";
import test from "node:test";
import { getOperationalReadiness } from "../lib/operational-readiness";

test("operational readiness exposes missing configuration without secret values", () => {
    const readiness = getOperationalReadiness({ DATABASE_URL: "postgres://pooled", DIRECT_URL: "postgres://direct", UPSTASH_REDIS_REST_URL: "https://redis.example", UPSTASH_REDIS_REST_TOKEN: "token", QSTASH_TOKEN: "qstash", QSTASH_CURRENT_SIGNING_KEY: "current", QSTASH_NEXT_SIGNING_KEY: "next", APP_URL: "https://app.example", CRON_SECRET: "secret" });
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.missingRequired, []);
    assert.equal(readiness.checks.find((check) => check.key === "VAPID_PRIVATE_KEY")?.configured, false);
    assert.doesNotMatch(JSON.stringify(readiness), /postgres:\/\/pooled/);
});
