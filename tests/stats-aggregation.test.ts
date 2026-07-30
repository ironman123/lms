import assert from "node:assert/strict";
import test from "node:test";
import {
    applyStatsContribution,
    emptyAggregateStats,
    rebuildAggregateStats,
    type StatsContributionPayload,
} from "../lib/stats-aggregation";

function payload(
    completedAt: string,
    correct: boolean
): StatsContributionPayload {
    return {
        sessionScore: correct ? 100 : -25,
        timeTakenSecs: 60,
        completedAt,
        questions: [
            {
                isCorrect: correct,
                grade: correct ? "CORRECT" : "INCORRECT",
                type: "MCQ",
                difficulty: "EASY",
                topicPath: "Math > Arithmetic",
            },
            {
                isCorrect: false,
                grade: "SKIPPED",
                type: "MCQ",
                difficulty: "EASY",
                topicPath: "Math > Arithmetic",
            },
        ],
    };
}

test("only objectively graded answers affect accuracy", () => {
    const result = applyStatsContribution(
        emptyAggregateStats(),
        payload("2026-07-29T10:00:00.000Z", true)
    );
    assert.equal(result.totalTests, 1);
    assert.equal(result.totalQuestions, 1);
    assert.equal(result.totalCorrect, 1);
    assert.deepEqual(result.typeAccuracy.MCQ, { c: 1, t: 1 });
});

test("rebuilding contributions produces stable totals and streaks", () => {
    const contributions = [
        payload("2026-07-28T10:00:00.000Z", true),
        payload("2026-07-29T10:00:00.000Z", false),
    ];
    const first = rebuildAggregateStats(contributions);
    const rebuilt = rebuildAggregateStats(contributions);
    assert.deepEqual(rebuilt, first);
    assert.equal(first.totalTests, 2);
    assert.equal(first.totalQuestions, 2);
    assert.equal(first.totalCorrect, 1);
    assert.equal(first.currentStreak, 2);
    assert.deepEqual(first.subjectAccuracy.Math, { c: 1, t: 2 });
});
