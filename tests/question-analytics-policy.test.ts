import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionAnalyticsDeltas } from "../lib/question-analytics-policy";

test("daily question analytics preserves grades, option choices, and confidence", () => {
    const rows = buildQuestionAnalyticsDeltas([
        { questionId: "q1", grade: "CORRECT", selectedAnswer: "1", confidenceLevel: 4, totalDwellTime: 12 },
        { questionId: "q1", grade: "INCORRECT", selectedAnswer: "2", confidenceLevel: 4, totalDwellTime: 8 },
        { questionId: "q1", grade: "SKIPPED", selectedAnswer: null, confidenceLevel: null, totalDwellTime: 3 },
    ]);
    const row = rows.get("q1");
    assert.equal(row?.interactionCount, 3);
    assert.equal(row?.correctCount, 1);
    assert.equal(row?.incorrectCount, 1);
    assert.equal(row?.skippedCount, 1);
    assert.equal(row?.totalDwellSeconds, 23);
    assert.equal(row?.options.get("1"), 1);
    assert.equal(row?.confidence.get(4)?.correctCount, 1);
    assert.equal(row?.confidence.get(4)?.incorrectCount, 1);
});
