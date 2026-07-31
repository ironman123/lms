import assert from "node:assert/strict";
import test from "node:test";
import {
    PAPER_JSON_TEMPLATE,
    normalizePaperJsonQuestion,
    parsePaperJsonImport,
} from "../lib/paper-json-import";

function paperWithQuestion(question: Record<string, unknown>) {
    return JSON.stringify({
        version: 1,
        title: "Import test",
        year: 2025,
        type: "PYQ",
        questions: [question],
    });
}

const cancelledQuestion = {
    number: 84,
    content: "Officially cancelled question",
    type: "MCQ",
    difficulty: "MEDIUM",
    marks: 0,
    negativeMarks: 0,
    topicPath: "General",
    explanation: "Question Cancelled in Official Answer Key",
    options: [],
    correctAnswers: [],
    exactAnswer: null,
    answerMin: null,
    answerMax: null,
    modelAnswer: null,
};

test("recognizes the legacy official-cancellation pattern", () => {
    const result = parsePaperJsonImport(
        paperWithQuestion(cancelledQuestion)
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.questions[0].cancelled, true);
});

test("accepts an explicitly cancelled question without an answer key", () => {
    const result = parsePaperJsonImport(
        paperWithQuestion({
            ...cancelledQuestion,
            explanation: null,
            cancelled: true,
        })
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.questions[0].cancelled, true);
});

test("does not silently treat a malformed ordinary MCQ as cancelled", () => {
    const result = parsePaperJsonImport(
        paperWithQuestion({
            ...cancelledQuestion,
            marks: 1,
            explanation: null,
        })
    );

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /Question 84/);
    assert.ok(
        result.issues.some((issue) => issue.path === "correctAnswers")
    );
});

test("requires cancelled questions to have zero scoring impact", () => {
    const result = parsePaperJsonImport(
        paperWithQuestion({
            ...cancelledQuestion,
            cancelled: true,
            marks: 1,
        })
    );

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /must award 0 marks/);
});

test("the downloadable JSON paper template is valid", () => {
    const result = parsePaperJsonImport(
        JSON.stringify(PAPER_JSON_TEMPLATE)
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.questions.length, 5);
    assert.deepEqual(result.data.questions[1].correctAnswers, ["A", "C"]);
    assert.equal(result.data.questions[4].cancelled, true);
    const normalized = normalizePaperJsonQuestion(result.data.questions[1]);
    assert.deepEqual(normalized.correctOptions, [0, 2]);
    assert.deepEqual(
        normalized.options.map((option) => option.index),
        [0, 1, 2, 3]
    );
});

test("JSON import rejects answer labels that do not exist", () => {
    const invalid = structuredClone(PAPER_JSON_TEMPLATE);
    invalid.questions[0].correctAnswers = ["Z"];

    const result = parsePaperJsonImport(JSON.stringify(invalid));

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /does not match an option label/);
});

test("JSON import validates numerical answer ranges", () => {
    const invalid = structuredClone(PAPER_JSON_TEMPLATE);
    invalid.questions[2].exactAnswer = null;
    invalid.questions[2].answerMin = 100;
    invalid.questions[2].answerMax = 90;

    const result = parsePaperJsonImport(JSON.stringify(invalid));

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /answerMin cannot be greater than answerMax/);
});

test("JSON import rejects duplicate correct-answer labels", () => {
    const invalid = structuredClone(PAPER_JSON_TEMPLATE);
    invalid.questions[1].correctAnswers = ["A", "A"];

    const result = parsePaperJsonImport(JSON.stringify(invalid));

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /Correct answer labels must be unique/);
});

test("JSON import uses the same year limit as the paper form", () => {
    const invalid = structuredClone(PAPER_JSON_TEMPLATE);
    invalid.year = new Date().getFullYear() + 1;

    const result = parsePaperJsonImport(JSON.stringify(invalid));

    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error, /Too big/);
});
