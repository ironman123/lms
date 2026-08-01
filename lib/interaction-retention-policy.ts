import { z } from "zod";

export const interactionRetentionConfigSchema = z.object({
    enabled: z.boolean(),
    retentionDays: z.number().int().min(30).max(3_650),
    maxDetailedSessionsPerUser: z.number().int().min(5).max(1_000),
    batchSize: z.number().int().min(1).max(200),
});

export type InteractionRetentionConfigInput = z.infer<
    typeof interactionRetentionConfigSchema
>;

export const archivedInteractionSchema = z.object({
    id: z.string().uuid(),
    questionId: z.string().uuid(),
    selectedAnswer: z.string().nullable(),
    grade: z.enum([
        "CORRECT",
        "INCORRECT",
        "SKIPPED",
        "PENDING",
        "UNAVAILABLE",
    ]),
    questionPosition: z.number().int().nullable(),
    marksAwarded: z.number().finite(),
    penaltyApplied: z.number().finite(),
    isFlagged: z.boolean(),
    wasHinted: z.boolean(),
    confidenceLevel: z.number().int().min(0).max(100).nullable(),
    totalDwellTime: z.number().int().min(0),
    hesitationCount: z.number().int().min(0),
});

export const interactionArchiveSchema = z.object({
    version: z.literal(1),
    interactions: z.array(archivedInteractionSchema).max(1_000),
});

export type ArchivedInteraction = z.infer<typeof archivedInteractionSchema>;

export function parseInteractionArchive(value: unknown) {
    const parsed = interactionArchiveSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export type ConfidenceCounts = Record<string, number>;

export function confidenceBucketKey(level: number, isCorrect: boolean) {
    return `${level}:${isCorrect ? "correct" : "incorrect"}`;
}

export function parseConfidenceCounts(value: unknown): ConfidenceCounts {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).flatMap(([key, count]) =>
            typeof count === "number" && Number.isInteger(count) && count >= 0
                ? [[key, count]]
                : []
        )
    );
}

export function mergeConfidenceCounts(
    stored: unknown,
    additions: Array<{ confidenceLevel: number | null; isCorrect: boolean }>
) {
    const result = parseConfidenceCounts(stored);
    for (const addition of additions) {
        if (addition.confidenceLevel === null) continue;
        const key = confidenceBucketKey(
            addition.confidenceLevel,
            addition.isCorrect
        );
        result[key] = (result[key] ?? 0) + 1;
    }
    return result;
}

export function archivedConfidenceBuckets(value: unknown) {
    return Object.entries(parseConfidenceCounts(value)).flatMap(([key, count]) => {
        const match = /^(\d+):(correct|incorrect)$/.exec(key);
        if (!match) return [];
        return [{
            confidenceLevel: Number(match[1]),
            isCorrect: match[2] === "correct",
            count,
        }];
    });
}
