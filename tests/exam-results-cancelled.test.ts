import assert from "node:assert/strict";
import test from "node:test";
import {
    calculateSessionResult,
    evaluateAnswer,
    type ResultQuestion,
} from "../lib/exam-results";

function question(
    overrides: Partial<ResultQuestion> = {}
): ResultQuestion {
    return {
        id: "question-1",
        contentRevision: 1,
        content: "Question",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0.33,
        explanation: null,
        topicPath: null,
        options: [
            { index: 0, text: "A" },
            { index: 1, text: "B" },
        ],
        correctOptions: [0],
        exactAnswer: null,
        answerMin: null,
        answerMax: null,
        modelAnswer: null,
        ...overrides,
    };
}

test("cancelled questions are unavailable and never penalized", () => {
    const result = evaluateAnswer(
        question({
            isCancelled: true,
            marks: 0,
            negativeMarks: 0,
            options: [],
            correctOptions: [],
        }),
        "1"
    );

    assert.equal(result.grade, "UNAVAILABLE");
    assert.equal(result.marksAwarded, 0);
    assert.equal(result.penaltyApplied, 0);
});

test("cancelled questions are excluded from score and accuracy denominators", () => {
    const active = question();
    const cancelled = question({
        id: "question-2",
        isCancelled: true,
        marks: 0,
        negativeMarks: 0,
        options: [],
        correctOptions: [],
    });

    const result = calculateSessionResult(
        [active, cancelled],
        [{
            questionId: active.id,
            selectedAnswer: "0",
            visitCount: 1,
            dwellTimeSeconds: 10,
            hesitationCount: 0,
            isFlagged: false,
            wasHinted: false,
            confidenceLevel: null,
        }]
    );

    assert.equal(result.totalQuestions, 2);
    assert.equal(result.correctCount, 1);
    assert.equal(result.unavailableCount, 1);
    assert.equal(result.maximumMarks, 1);
    assert.equal(result.earnedMarks, 1);
    assert.equal(result.totalScore, 100);
    assert.equal(result.accuracy, 100);
});
