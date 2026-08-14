import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQuestionQuality } from "../lib/moderation/question-quality";

const base = {
    correctCount: 20,
    incorrectCount: 20,
    skippedCount: 0,
    averageDwellSeconds: 40,
    expectedTimeSeconds: 60,
    hasOpenCase: false,
    isEscalated: false,
    uniqueReporterCount: 0,
};

test("question-quality marker prioritises escalated and open student reports", () => {
    assert.equal(evaluateQuestionQuality({ ...base, isEscalated: true, uniqueReporterCount: 3 }).status, "ESCALATED");
    assert.equal(evaluateQuestionQuality({ ...base, hasOpenCase: true }).status, "REVIEW");
});

test("question-quality marker waits for enough evidence before healthy", () => {
    assert.equal(evaluateQuestionQuality({ ...base, correctCount: 10, incorrectCount: 5 }).status, "INSUFFICIENT");
    assert.equal(evaluateQuestionQuality({ ...base, correctCount: 60, incorrectCount: 40 }).status, "HEALTHY");
});

test("question-quality marker raises only explainable aggregate signals", () => {
    assert.equal(evaluateQuestionQuality({ ...base, skippedCount: 30 }).status, "REVIEW");
    assert.equal(evaluateQuestionQuality({ ...base, correctCount: 5, incorrectCount: 35, averageDwellSeconds: 100 }).status, "REVIEW");
});
