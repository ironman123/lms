import test from "node:test";
import assert from "node:assert/strict";
import {
    buildPaperCaseKey,
    buildQuestionCaseKey,
    hashModerationSnapshot,
    shouldEscalate,
} from "../lib/moderation/report-policy";
import {
    contentReportInputSchema,
    moderationConfigInputSchema,
} from "../lib/moderation/schemas";

test("snapshot hashes are stable across object key order", () => {
    const left = {
        content: "Question",
        options: [{ text: "A", index: 0 }],
        nested: { b: 2, a: 1 },
    };
    const right = {
        nested: { a: 1, b: 2 },
        options: [{ index: 0, text: "A" }],
        content: "Question",
    };

    assert.equal(
        hashModerationSnapshot(left),
        hashModerationSnapshot(right)
    );
});

test("question case keys separate different snapshots", () => {
    assert.notEqual(
        buildQuestionCaseKey("question", "revision-one"),
        buildQuestionCaseKey("question", "revision-two")
    );
    assert.equal(
        buildPaperCaseKey("paper", "snapshot"),
        "PAPER:paper:snapshot"
    );
});

test("escalation occurs exactly at the configured unique-user threshold", () => {
    assert.equal(shouldEscalate(2, 3), false);
    assert.equal(shouldEscalate(3, 3), true);
    assert.equal(shouldEscalate(4, 3), true);
});

test("report input only accepts a valid source for each target", () => {
    const question = contentReportInputSchema.safeParse({
        targetType: "QUESTION",
        questionId: "9b6b54d4-f489-402b-8c33-08c1b8c7760a",
        sessionId: "bcbcc650-0e84-4ac8-bd5e-4c5d47f5f74d",
        source: "ACTIVE_SESSION",
        category: "WRONG_ANSWER_KEY",
    });
    const invalidPaper = contentReportInputSchema.safeParse({
        targetType: "PAPER",
        paperId: "9b6b54d4-f489-402b-8c33-08c1b8c7760a",
        source: "RESULT_REVIEW",
        category: "OTHER",
    });

    assert.equal(question.success, true);
    assert.equal(invalidPaper.success, false);
});

test("moderation limits remain typed and internally consistent", () => {
    assert.equal(
        moderationConfigInputSchema.safeParse({
            questionReportThreshold: 3,
            paperReportThreshold: 4,
            reportLimitPerHour: 10,
            reportLimitPerDay: 5,
            maxCommentLength: 1000,
        }).success,
        false
    );
});
