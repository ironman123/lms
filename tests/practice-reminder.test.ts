import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    MAX_PRACTICE_REMINDER_MINUTES,
    normalizePracticeReminderMinutes,
} from "../lib/practice-reminder";

test("practice reminders are optional and bounded", () => {
    assert.equal(normalizePracticeReminderMinutes(""), null);
    assert.equal(normalizePracticeReminderMinutes("25"), 25);
    assert.equal(
        normalizePracticeReminderMinutes(MAX_PRACTICE_REMINDER_MINUTES),
        1440
    );
    assert.throws(() => normalizePracticeReminderMinutes("1.5"));
    assert.throws(() => normalizePracticeReminderMinutes(0));
    assert.throws(() => normalizePracticeReminderMinutes(1441));
});

test("practice reminder never submits or writes session data", () => {
    const reminder = readFileSync(
        new URL("../components/PracticeReminderTimer.tsx", import.meta.url),
        "utf8"
    );
    const storage = readFileSync(
        new URL("../lib/practice-reminder.ts", import.meta.url),
        "utf8"
    );
    assert.match(storage, /sessionStorage/);
    assert.doesNotMatch(storage, /prisma|fetch\(|server action/i);
    assert.doesNotMatch(reminder, /completeExamSession|submitSession|onExpire/);
    assert.match(reminder, /nothing was submitted or changed/);
});
