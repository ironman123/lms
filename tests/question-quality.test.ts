import test from "node:test";
import assert from "node:assert/strict";
import {
    buildQuestionQualityQueue,
    getQuestionQualitySampleBand,
} from "../lib/moderation/question-quality";

test("question-quality sample bands avoid premature conclusions", () => {
    assert.equal(getQuestionQualitySampleBand(0), "INSUFFICIENT");
    assert.equal(getQuestionQualitySampleBand(29), "INSUFFICIENT");
    assert.equal(getQuestionQualitySampleBand(30), "EARLY");
    assert.equal(getQuestionQualitySampleBand(99), "EARLY");
    assert.equal(getQuestionQualitySampleBand(100), "RELIABLE");
});

test("question-quality queue merges revision cases and separates skipped answers", () => {
    const now = new Date("2026-08-14T10:00:00.000Z");
    const rows = buildQuestionQualityQueue(
        [
            {
                caseId: "old-case",
                questionId: "question-1",
                content: "Current question",
                paper: { id: "paper-1", title: "Paper" },
                isEscalated: false,
                updatedAt: new Date("2026-08-13T10:00:00.000Z"),
                reports: [
                    {
                        reporterId: "student-1",
                        category: "TYPO_OR_FORMATTING",
                        updatedAt: new Date("2026-08-13T10:00:00.000Z"),
                    },
                ],
            },
            {
                caseId: "new-case",
                questionId: "question-1",
                content: "Current question",
                paper: { id: "paper-1", title: "Paper" },
                isEscalated: true,
                updatedAt: now,
                reports: [
                    {
                        reporterId: "student-1",
                        category: "WRONG_ANSWER_KEY",
                        updatedAt: now,
                    },
                    {
                        reporterId: "student-2",
                        category: "WRONG_ANSWER_KEY",
                        updatedAt: now,
                    },
                ],
            },
        ],
        new Map([
            [
                "question-1",
                {
                    questionId: "question-1",
                    correctCount: 18,
                    incorrectCount: 12,
                    skippedCount: 10,
                    averageDwellSeconds: 42.4,
                },
            ],
        ])
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.caseId, "new-case");
    assert.equal(rows[0]?.openCaseCount, 2);
    assert.equal(rows[0]?.uniqueReporterCount, 2);
    assert.equal(rows[0]?.accuracy, 60);
    assert.equal(rows[0]?.skipRate, 25);
    assert.equal(rows[0]?.sampleBand, "EARLY");
    assert.equal(rows[0]?.topCategories[0]?.category, "WRONG_ANSWER_KEY");
});
