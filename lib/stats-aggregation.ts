import { z } from "zod";
import { toAppDateKey } from "@/lib/date-utils";

export const statsContributionPayloadSchema = z.object({
    sessionScore: z.number().finite(),
    timeTakenSecs: z.number().int().min(0),
    completedAt: z.string().datetime(),
    questions: z.array(z.object({
        isCorrect: z.boolean(),
        grade: z.enum([
            "CORRECT",
            "INCORRECT",
            "SKIPPED",
            "PENDING",
            "UNAVAILABLE",
        ]),
        type: z.string().min(1).max(50),
        difficulty: z.string().min(1).max(50),
        topicPath: z.string().nullable(),
    })).max(1_000),
});

export type StatsContributionPayload = z.infer<
    typeof statsContributionPayloadSchema
>;

export type AccuracyMap = Record<string, { c: number; t: number }>;

export type AggregateStats = {
    totalTests: number;
    totalQuestions: number;
    totalCorrect: number;
    totalStudySecs: number;
    scoreSum: number;
    currentStreak: number;
    lastActiveDate: string | null;
    typeAccuracy: AccuracyMap;
    diffAccuracy: AccuracyMap;
    subjectAccuracy: AccuracyMap;
};

export const emptyAggregateStats = (): AggregateStats => ({
    totalTests: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    totalStudySecs: 0,
    scoreSum: 0,
    currentStreak: 0,
    lastActiveDate: null,
    typeAccuracy: {},
    diffAccuracy: {},
    subjectAccuracy: {},
});

function cloneAccuracyMap(value: unknown): AccuracyMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).flatMap(([key, candidate]) => {
            if (
                !candidate ||
                typeof candidate !== "object" ||
                Array.isArray(candidate)
            ) return [];
            const counts = candidate as Record<string, unknown>;
            return typeof counts.c === "number" && typeof counts.t === "number"
                ? [[key, { c: counts.c, t: counts.t }]]
                : [];
        })
    );
}

export function aggregateFromStored(value: {
    totalTests: number;
    totalQuestions: number;
    totalCorrect: number;
    totalStudySecs: number;
    scoreSum: number;
    currentStreak: number;
    lastActiveDate: string | null;
    typeAccuracy: unknown;
    diffAccuracy: unknown;
    subjectAccuracy: unknown;
}): AggregateStats {
    return {
        ...value,
        typeAccuracy: cloneAccuracyMap(value.typeAccuracy),
        diffAccuracy: cloneAccuracyMap(value.diffAccuracy),
        subjectAccuracy: cloneAccuracyMap(value.subjectAccuracy),
    };
}

function addAccuracy(
    map: AccuracyMap,
    key: string,
    isCorrect: boolean
) {
    map[key] ??= { c: 0, t: 0 };
    map[key].t++;
    if (isCorrect) map[key].c++;
}

export function applyStatsContribution(
    source: AggregateStats,
    payload: StatsContributionPayload
): AggregateStats {
    const next: AggregateStats = {
        ...source,
        typeAccuracy: cloneAccuracyMap(source.typeAccuracy),
        diffAccuracy: cloneAccuracyMap(source.diffAccuracy),
        subjectAccuracy: cloneAccuracyMap(source.subjectAccuracy),
    };
    const graded = payload.questions.filter(
        (question) =>
            question.grade === "CORRECT" ||
            question.grade === "INCORRECT"
    );
    const dateKey = toAppDateKey(new Date(payload.completedAt));
    const previousDate = next.lastActiveDate;

    next.totalTests++;
    next.totalQuestions += graded.length;
    next.totalCorrect += graded.filter((question) => question.isCorrect).length;
    next.totalStudySecs += payload.timeTakenSecs;
    next.scoreSum += payload.sessionScore;

    if (previousDate !== dateKey) {
        const previousDay = toAppDateKey(
            new Date(new Date(payload.completedAt).getTime() - 86_400_000)
        );
        next.currentStreak =
            previousDate === previousDay ? next.currentStreak + 1 : 1;
        next.lastActiveDate = dateKey;
    }

    for (const question of graded) {
        const subject =
            question.topicPath?.split(">")[0]?.trim() || "General";
        addAccuracy(next.typeAccuracy, question.type, question.isCorrect);
        addAccuracy(
            next.diffAccuracy,
            question.difficulty,
            question.isCorrect
        );
        addAccuracy(next.subjectAccuracy, subject, question.isCorrect);
    }

    return next;
}

export function rebuildAggregateStats(payloads: StatsContributionPayload[]) {
    return payloads.reduce(
        applyStatsContribution,
        emptyAggregateStats()
    );
}
