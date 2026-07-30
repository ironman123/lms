import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateSessionResult,
    createQuestionSetSnapshot,
    evaluateAnswer,
    formatCorrectAnswer,
    formatResultAnswer,
    formatResultDuration,
    hasMeaningfulAnswer,
    parseQuestionSetSnapshot,
    type ResultQuestion,
} from "../lib/exam-results";

function question(
    overrides: Partial<ResultQuestion> = {}
): ResultQuestion {
    return {
        id: "question-1",
        content: "Question",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 2,
        negativeMarks: 0.5,
        explanation: "Explanation",
        topicPath: "General",
        options: [
            { index: 10, label: "A", text: "Wrong" },
            { index: 20, label: "B", text: "Correct" },
        ],
        correctOptions: [20],
        exactAnswer: null,
        answerMin: null,
        answerMax: null,
        modelAnswer: null,
        ...overrides,
    };
}

const metric = {
    questionId: "question-1",
    selectedAnswer: "20",
    visitCount: 1,
    dwellTimeSeconds: 12,
    hesitationCount: 0,
    isFlagged: false,
    wasHinted: false,
    confidenceLevel: null,
};

test("MCQ scoring uses option indices rather than array positions", () => {
    const result = evaluateAnswer(question(), "20");
    assert.equal(result.grade, "CORRECT");
    assert.equal(result.marksAwarded, 2);
});

test("incorrect objective answers apply negative marking", () => {
    const result = evaluateAnswer(question(), "10");
    assert.equal(result.grade, "INCORRECT");
    assert.equal(result.marksAwarded, -0.5);
    assert.equal(result.penaltyApplied, 0.5);
});

test("MSQ comparison is order-independent and rejects incomplete sets", () => {
    const msq = question({
        type: "MSQ",
        correctOptions: [0, 2],
        options: [
            { index: 0, text: "One" },
            { index: 1, text: "Two" },
            { index: 2, text: "Three" },
        ],
    });
    assert.equal(evaluateAnswer(msq, "2,0").grade, "CORRECT");
    assert.equal(evaluateAnswer(msq, "0").grade, "INCORRECT");
});

test("numerical answers support exact values and ranges", () => {
    assert.equal(
        evaluateAnswer(
            question({ type: "NUMERICAL", exactAnswer: 9.8 }),
            "9.8"
        ).grade,
        "CORRECT"
    );
    assert.equal(
        evaluateAnswer(
            question({
                type: "NUMERICAL",
                exactAnswer: null,
                answerMin: 9.7,
                answerMax: 9.9,
            }),
            "9.75"
        ).grade,
        "CORRECT"
    );
});

test("empty answers are skipped and subjective answers remain pending without penalty", () => {
    assert.equal(evaluateAnswer(question(), "  ").grade, "SKIPPED");
    const subjective = evaluateAnswer(
        question({ type: "SUBJECTIVE", negativeMarks: 2 }),
        "My response"
    );
    assert.equal(subjective.grade, "PENDING");
    assert.equal(subjective.penaltyApplied, 0);
});

test("questions without an answer key are unavailable rather than incorrect", () => {
    const unavailable = evaluateAnswer(
        question({ correctOptions: [], negativeMarks: 1 }),
        "10"
    );
    assert.equal(unavailable.grade, "UNAVAILABLE");
    assert.equal(unavailable.marksAwarded, 0);
    assert.equal(unavailable.penaltyApplied, 0);

    const result = calculateSessionResult(
        [
            question({ id: "gradable", marks: 2 }),
            question({
                id: "missing-key",
                marks: 5,
                correctOptions: [],
                negativeMarks: 1,
            }),
        ],
        [
            { ...metric, questionId: "gradable", selectedAnswer: "20" },
            { ...metric, questionId: "missing-key", selectedAnswer: "10" },
        ]
    );
    assert.equal(result.unavailableCount, 1);
    assert.equal(result.incorrectCount, 0);
    assert.equal(result.maximumMarks, 2);
    assert.equal(result.totalScore, 100);
});

test("session totals use all paper questions, not received interaction rows", () => {
    const questions = [
        question(),
        question({ id: "question-2", marks: 1, negativeMarks: 0 }),
        question({ id: "question-3", marks: 1, negativeMarks: 0 }),
    ];
    const result = calculateSessionResult(questions, [metric]);
    assert.equal(result.totalQuestions, 3);
    assert.equal(result.correctCount, 1);
    assert.equal(result.skippedCount, 2);
    assert.equal(result.maximumMarks, 4);
    assert.equal(result.earnedMarks, 2);
    assert.equal(result.totalScore, 50);
    assert.equal(result.accuracy, 100);
    assert.equal(result.metrics.length, 3);
});

test("answer formatting resolves non-contiguous option indices", () => {
    const snapshot = calculateSessionResult([question()], [metric]).metrics[0]
        .questionSnapshot;
    assert.equal(formatResultAnswer(snapshot, "20"), "B. Correct");
    assert.equal(formatCorrectAnswer(snapshot), "B. Correct");
});

test("duration formatting does not display 0m for short attempts", () => {
    assert.equal(formatResultDuration(42), "42s");
    assert.equal(formatResultDuration(125), "2m 5s");
    assert.equal(formatResultDuration(3720), "1h 2m");
});

test("client answer state does not count empty values as attempted", () => {
    assert.equal(hasMeaningfulAnswer("  "), false);
    assert.equal(hasMeaningfulAnswer([]), false);
    assert.equal(hasMeaningfulAnswer("0"), true);
    assert.equal(hasMeaningfulAnswer(["0", "2"]), true);
});

test("mixed answers produce consistent score-card metrics", () => {
    const questions = [
        question({ id: "correct-mcq", marks: 2 }),
        question({ id: "wrong-mcq", marks: 2, negativeMarks: 0.5 }),
        question({
            id: "correct-msq",
            type: "MSQ",
            marks: 2,
            correctOptions: [0, 2],
        }),
        question({
            id: "skipped-number",
            type: "NUMERICAL",
            marks: 1,
            exactAnswer: 42,
            negativeMarks: 0,
        }),
        question({
            id: "pending-subjective",
            type: "SUBJECTIVE",
            marks: 1,
            negativeMarks: 1,
        }),
    ];
    const submitted = [
        { ...metric, questionId: "correct-mcq", selectedAnswer: "20" },
        { ...metric, questionId: "wrong-mcq", selectedAnswer: "10" },
        { ...metric, questionId: "correct-msq", selectedAnswer: "2,0" },
        {
            ...metric,
            questionId: "pending-subjective",
            selectedAnswer: "A reasoned response",
        },
    ];

    const result = calculateSessionResult(questions, submitted);
    assert.deepEqual(
        result.metrics.map((item) => item.grade),
        ["CORRECT", "INCORRECT", "CORRECT", "SKIPPED", "PENDING"]
    );
    assert.equal(result.totalQuestions, 5);
    assert.equal(result.attemptedCount, 4);
    assert.equal(result.correctCount, 2);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.pendingReviewCount, 1);
    assert.equal(result.maximumMarks, 8);
    assert.equal(result.earnedMarks, 3.5);
    assert.equal(result.penaltyMarks, 0.5);
    assert.equal(result.totalScore, 43.75);
    assert.equal(result.accuracy, 66.67);
});

test("session question-set snapshots preserve order and reject corrupt data", () => {
    const original = [
        question({ id: "first" }),
        question({ id: "second", content: "Frozen wording" }),
    ];
    const snapshot = createQuestionSetSnapshot(original);
    assert.deepEqual(
        parseQuestionSetSnapshot(snapshot)?.map((item) => item.id),
        ["first", "second"]
    );
    assert.equal(
        parseQuestionSetSnapshot([{ ...snapshot[0], marks: "two" }]),
        null
    );
});
