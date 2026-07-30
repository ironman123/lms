import test from "node:test";
import assert from "node:assert/strict";
import {
    formatCompactDuration,
    getEffectiveStreak,
    toAppDateKey,
} from "../lib/date-utils";

test("application date keys use Asia/Kolkata rather than UTC", () => {
    assert.equal(
        toAppDateKey(new Date("2026-07-30T19:30:00.000Z")),
        "2026-07-31"
    );
});

test("stale streaks decay when the dashboard is read", () => {
    const now = new Date("2026-07-30T12:00:00.000Z");
    assert.equal(getEffectiveStreak(5, "2026-07-30", now), 5);
    assert.equal(getEffectiveStreak(5, "2026-07-29", now), 5);
    assert.equal(getEffectiveStreak(5, "2026-07-20", now), 0);
});

test("short durations never display as zero minutes", () => {
    assert.equal(formatCompactDuration(42), "42s");
    assert.equal(formatCompactDuration(125), "2m 5s");
});
