import test from "node:test";
import assert from "node:assert/strict";
import {
    buildContentPerformance,
    buildExamContentHealth,
    buildPaperContentHealth,
} from "../lib/moderation/content-health";

const now = new Date("2026-08-14T10:00:00.000Z");

test("paper health deduplicates reporters across question and paper cases", () => {
    const rows = buildPaperContentHealth(
        [
            {
                id: "question-case",
                paper: { id: "paper-1", title: "Paper 1", exams: [] },
                questionId: "question-1",
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
            {
                id: "paper-case",
                paper: { id: "paper-1", title: "Paper 1", exams: [] },
                questionId: null,
                isEscalated: false,
                updatedAt: now,
                reports: [
                    {
                        reporterId: "student-1",
                        category: "INCOMPLETE_PAPER",
                        updatedAt: now,
                    },
                ],
            },
        ],
        new Map([["paper-1", 20]])
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.reportCount, 3);
    assert.equal(rows[0]?.uniqueReporterCount, 2);
    assert.equal(rows[0]?.affectedQuestionCount, 1);
    assert.equal(rows[0]?.reportersPerHundredAttempts, 10);
    assert.equal(rows[0]?.escalatedCaseCount, 1);
});

test("paper health keeps unknown attempt volume unranked by rate", () => {
    const rows = buildPaperContentHealth(
        [
            {
                id: "case",
                paper: { id: "paper-1", title: "Paper 1", exams: [] },
                questionId: null,
                isEscalated: false,
                updatedAt: now,
                reports: [],
            },
        ],
        new Map()
    );

    assert.equal(rows[0]?.completedAttemptCount, 0);
    assert.equal(rows[0]?.reportersPerHundredAttempts, null);
});

test("exam health uses frozen exam attempt counts and deduplicates reporters", () => {
    const papers = [
        {
            paperId: "paper-1",
            title: "Paper 1",
            exams: [{ id: "exam-1", name: "Exam 1", slug: "exam-1" }],
            openCaseCount: 2,
            escalatedCaseCount: 1,
            affectedQuestionCount: 1,
            reportCount: 3,
            uniqueReporterCount: 2,
            completedAttemptCount: 20,
            reportersPerHundredAttempts: 10,
            topCategories: [],
            lastReportedAt: now,
        },
        {
            paperId: "paper-2",
            title: "Paper 2",
            exams: [{ id: "exam-1", name: "Exam 1", slug: "exam-1" }],
            openCaseCount: 1,
            escalatedCaseCount: 0,
            affectedQuestionCount: 1,
            reportCount: 2,
            uniqueReporterCount: 2,
            completedAttemptCount: 10,
            reportersPerHundredAttempts: 20,
            topCategories: [],
            lastReportedAt: now,
        },
    ];
    const rows = buildExamContentHealth(
        papers,
        new Map([["exam-1", 25]]),
        new Map([
            ["paper-1", new Set(["student-1", "student-2"])],
            ["paper-2", new Set(["student-2", "student-3"])],
        ]),
        new Map([
            ["paper-1", new Set(["question-1"])],
            ["paper-2", new Set(["question-2"])],
        ])
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.completedAttemptCount, 25);
    assert.equal(rows[0]?.uniqueReporterCount, 3);
    assert.equal(rows[0]?.reportersPerHundredAttempts, 12);
    assert.equal(rows[0]?.paperCount, 2);
});

test("content performance includes all standard starts but scores completed sessions only", () => {
    const performance = buildContentPerformance(
        new Map([
            ["COMPLETED", 8],
            ["ABANDONED", 1],
            ["ACTIVE", 1],
        ]),
        {
            completedSessionCount: 8,
            averageScore: 62.25,
            averageAccuracy: 68.75,
            averageTimeTakenSecs: 143.6,
        }
    );
    assert.deepEqual(performance, {
        startedSessionCount: 10,
        completedSessionCount: 8,
        completionRate: 80,
        averageScore: 62.3,
        averageAccuracy: 68.8,
        averageTimeTakenSecs: 144,
    });
});
