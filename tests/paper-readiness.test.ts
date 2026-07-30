import assert from "node:assert/strict";
import test from "node:test";
import {
    getPaperReadiness,
    paperReadinessMessage,
} from "../lib/paper-readiness";
import type { ResultQuestion } from "../lib/exam-results";

function question(
    overrides: Partial<ResultQuestion> = {}
): ResultQuestion {
    return {
        id: crypto.randomUUID(),
        content: "What is 2 + 2?",
        type: "MCQ",
        difficulty: "EASY",
        marks: 1,
        negativeMarks: 0.25,
        explanation: null,
        topicPath: "Math",
        options: [
            { index: 0, text: "3" },
            { index: 1, text: "4" },
        ],
        correctOptions: [1],
        exactAnswer: null,
        answerMin: null,
        answerMax: null,
        modelAnswer: null,
        ...overrides,
    };
}

test("a fully keyed objective paper is ready", () => {
    const readiness = getPaperReadiness([
        question(),
        question({
            type: "NUMERICAL",
            options: null,
            correctOptions: [],
            exactAnswer: 4,
        }),
    ]);
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.issues, []);
});

test("missing and out-of-range answer keys block launch", () => {
    const readiness = getPaperReadiness([
        question({ correctOptions: [] }),
        question({ correctOptions: [9] }),
    ]);
    assert.equal(readiness.ready, false);
    assert.equal(
        readiness.issues.filter(
            (candidate) => candidate.code === "INVALID_ANSWER_KEY"
        ).length,
        2
    );
    assert.match(paperReadinessMessage(readiness) ?? "", /not ready/i);
});

test("subjective questions remain authorable but cannot auto-score", () => {
    const readiness = getPaperReadiness([
        question({
            type: "SUBJECTIVE",
            options: null,
            correctOptions: [],
            modelAnswer: "A model answer",
        }),
    ]);
    assert.equal(readiness.ready, false);
    assert.equal(
        readiness.issues[0].code,
        "SUBJECTIVE_REQUIRES_MANUAL_GRADING"
    );
});
