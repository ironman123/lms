import assert from "node:assert/strict";
import test from "node:test";
import {
    PAPER_JSON_TEMPLATE,
    normalizePaperJsonQuestion,
    parsePaperJsonImport,
} from "../lib/paper-json-import";

test("the downloadable JSON paper template is valid", () => {
    const result = parsePaperJsonImport(
        JSON.stringify(PAPER_JSON_TEMPLATE)
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.questions.length, 4);
    assert.deepEqual(result.data.questions[1].correctAnswers, ["A", "C"]);
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
