import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    archivedConfidenceBuckets,
    interactionRetentionConfigSchema,
    mergeConfidenceCounts,
    parseInteractionArchive,
} from "../lib/interaction-retention-policy";

test("retention configuration is bounded and disabled explicitly", () => {
    assert.deepEqual(
        interactionRetentionConfigSchema.parse({
            enabled: false,
            retentionDays: 180,
            maxDetailedSessionsPerUser: 50,
            batchSize: 25,
        }),
        {
            enabled: false,
            retentionDays: 180,
            maxDetailedSessionsPerUser: 50,
            batchSize: 25,
        }
    );
    assert.equal(
        interactionRetentionConfigSchema.safeParse({
            enabled: true,
            retentionDays: 1,
            maxDetailedSessionsPerUser: 0,
            batchSize: 5_000,
        }).success,
        false
    );
});

test("compact review archives preserve student-facing interaction fields", () => {
    const archive = parseInteractionArchive({
        version: 1,
        interactions: [{
            id: "00000000-0000-4000-8000-000000000001",
            questionId: "00000000-0000-4000-8000-000000000002",
            selectedAnswer: "1",
            grade: "CORRECT",
            questionPosition: 0,
            marksAwarded: 1,
            penaltyApplied: 0,
            isFlagged: true,
            wasHinted: false,
            confidenceLevel: 75,
            totalDwellTime: 12,
            hesitationCount: 1,
        }],
    });
    assert.ok(archive);
    assert.equal(archive.interactions[0].confidenceLevel, 75);
    assert.equal(archive.interactions[0].isFlagged, true);
});

test("archived confidence totals merge without losing previous sessions", () => {
    const merged = mergeConfidenceCounts(
        { "75:correct": 2 },
        [
            { confidenceLevel: 75, isCorrect: true },
            { confidenceLevel: 90, isCorrect: false },
            { confidenceLevel: null, isCorrect: false },
        ]
    );
    assert.deepEqual(merged, {
        "75:correct": 3,
        "90:incorrect": 1,
    });
    assert.deepEqual(archivedConfidenceBuckets(merged), [
        { confidenceLevel: 75, isCorrect: true, count: 3 },
        { confidenceLevel: 90, isCorrect: false, count: 1 },
    ]);
});

const service = readFileSync(
    new URL("../lib/interaction-retention.ts", import.meta.url),
    "utf8"
);
const resultLoader = readFileSync(
    new URL("../lib/result-loader.ts", import.meta.url),
    "utf8"
);
const migration = readFileSync(
    new URL(
        "../prisma/migrations/20260801210000_interaction_retention/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("retention refuses unprocessed or incomplete session state", () => {
    assert.match(service, /statsContribution\?\.processedAt/);
    assert.match(service, /storedStats\.totalTests !== processedCount/);
    assert.match(service, /examStats\.testsAttempted !== examProcessedCount/);
    assert.match(service, /mistake_projection_missing/);
    assert.match(service, /FINAL_INTERACTION_REVISION/);
    assert.match(service, /parseQuestionSetSnapshot/);
});

test("archive and historical counters are committed before interaction deletion", () => {
    const summary = service.indexOf("userInteractionArchiveStats.upsert");
    const archive = service.indexOf("interactionArchive: archive");
    const deletion = service.indexOf("questionInteraction.deleteMany");
    assert.ok(summary >= 0);
    assert.ok(archive > summary);
    assert.ok(deletion > archive);
    assert.match(service, /deleted\.count !== session\.totalQuestions/);
});

test("completed review falls back to the compact archive", () => {
    assert.match(resultLoader, /parseInteractionArchive/);
    assert.match(resultLoader, /usingArchive/);
});

test("retention migration defaults cleanup to disabled and enforces limits", () => {
    assert.match(migration, /"enabled" BOOLEAN NOT NULL DEFAULT false/);
    assert.match(migration, /InteractionRetentionConfig_valid_limits/);
    assert.match(migration, /"interactionArchive" JSONB/);
});
