import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    calculateConfidenceCalibration,
    confidenceBand,
} from "../lib/confidence-calibration";

test("confidence calibration compares belief with actual accuracy", () => {
    const result = calculateConfidenceCalibration([
        { confidenceLevel: 100, isCorrect: false, count: 2 },
        { confidenceLevel: 50, isCorrect: true, count: 2 },
    ]);
    assert.ok(result);
    assert.equal(result.sampleCount, 4);
    assert.equal(result.averageConfidence, 75);
    assert.equal(result.accuracy, 50);
    assert.equal(result.calibrationGap, 25);
    assert.equal(result.status, "OVERCONFIDENT");
    assert.equal(result.highConfidenceWrong, 2);
    assert.equal(result.lowConfidenceCorrect, 2);
});

test("well aligned confidence is calibrated", () => {
    const result = calculateConfidenceCalibration([
        { confidenceLevel: 75, isCorrect: true, count: 3 },
        { confidenceLevel: 25, isCorrect: false, count: 1 },
    ]);
    assert.ok(result);
    assert.equal(result.averageConfidence, 62.5);
    assert.equal(result.accuracy, 75);
    assert.equal(result.status, "UNDERCONFIDENT");
});

test("empty confidence history has no misleading score", () => {
    assert.equal(calculateConfidenceCalibration([]), null);
});

test("confidence bands are human readable", () => {
    assert.equal(confidenceBand(25), "Guess");
    assert.equal(confidenceBand(50), "Unsure");
    assert.equal(confidenceBand(75), "Sure");
    assert.equal(confidenceBand(100), "Certain");
});

test("session UI captures confidence through the crash-safe telemetry vault", () => {
    const hook = readFileSync(
        new URL(
            "../app/(main)/hooks/useExamTelemetry.ts",
            import.meta.url
        ),
        "utf8"
    );
    const session = readFileSync(
        new URL("../components/ActiveSessionClient.tsx", import.meta.url),
        "utf8"
    );
    assert.match(hook, /metrics\.confidenceLevel = Math\.max/);
    assert.match(hook, /persistOfflineSnapshot\(\)/);
    assert.match(session, /Guess/);
    assert.match(session, /Unsure/);
    assert.match(session, /Sure/);
    assert.match(session, /Certain/);
    assert.match(session, /handleConfidenceChange/);
});
