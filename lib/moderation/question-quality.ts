import type { ReportCategoryValue } from "@/lib/moderation/schemas";

export type QuestionQualitySampleBand =
    | "INSUFFICIENT"
    | "EARLY"
    | "RELIABLE";

export function getQuestionQualitySampleBand(
    objectiveAttemptCount: number
): QuestionQualitySampleBand {
    if (objectiveAttemptCount < 30) return "INSUFFICIENT";
    if (objectiveAttemptCount < 100) return "EARLY";
    return "RELIABLE";
}

/**
 * The marker shown in Paper Builder is deliberately conservative. It signals
 * where an editor should look; it never declares a question "bad" merely
 * because it is difficult.
 */
export type QuestionQualityStatus =
    | "INSUFFICIENT"
    | "HEALTHY"
    | "REVIEW"
    | "ESCALATED";

export type QuestionQualityIndicatorInput = {
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    averageDwellSeconds: number | null;
    expectedTimeSeconds: number | null;
    hasOpenCase: boolean;
    isEscalated: boolean;
    uniqueReporterCount: number;
};

export type QuestionQualityIndicator = {
    status: QuestionQualityStatus;
    reason: string;
    objectiveAttemptCount: number;
    totalInteractionCount: number;
    accuracy: number | null;
    skipRate: number | null;
    averageDwellSeconds: number | null;
    reportCount: number;
    topCategories: Array<{ category: ReportCategoryValue; count: number }>;
    caseId: string | null;
    optionSelections: Array<{ selectedAnswer: string; count: number }>;
    confidence: Array<{
        level: number;
        correctCount: number;
        incorrectCount: number;
    }>;
};

export function evaluateQuestionQuality(
    input: QuestionQualityIndicatorInput
): Pick<
    QuestionQualityIndicator,
    | "status"
    | "reason"
    | "objectiveAttemptCount"
    | "totalInteractionCount"
    | "accuracy"
    | "skipRate"
    | "averageDwellSeconds"
> {
    const objectiveAttemptCount = input.correctCount + input.incorrectCount;
    const totalInteractionCount = objectiveAttemptCount + input.skippedCount;
    const accuracy = roundedPercent(input.correctCount, objectiveAttemptCount);
    const skipRate = roundedPercent(input.skippedCount, totalInteractionCount);

    if (input.isEscalated) {
        return {
            status: "ESCALATED",
            reason: `Escalated by ${input.uniqueReporterCount} student${input.uniqueReporterCount === 1 ? "" : "s"}`,
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    if (input.hasOpenCase) {
        return {
            status: "REVIEW",
            reason: "An open student report needs review",
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    if (objectiveAttemptCount < 30) {
        return {
            status: "INSUFFICIENT",
            reason: "Fewer than 30 graded attempts",
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    if (skipRate !== null && skipRate >= 35) {
        return {
            status: "REVIEW",
            reason: "Unusually high skip rate; inspect wording and coverage",
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    const slowForExpectation =
        input.expectedTimeSeconds !== null &&
        input.averageDwellSeconds !== null &&
        input.averageDwellSeconds >= Math.max(90, input.expectedTimeSeconds * 1.5);
    if (accuracy !== null && accuracy <= 20 && slowForExpectation) {
        return {
            status: "REVIEW",
            reason: "Very low accuracy with slow responses; inspect clarity",
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    if (objectiveAttemptCount >= 100) {
        return {
            status: "HEALTHY",
            reason: "Reliable sample with no active quality signal",
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy,
            skipRate,
            averageDwellSeconds: input.averageDwellSeconds,
        };
    }
    return {
        status: "INSUFFICIENT",
        reason: "Early data: 30–99 graded attempts",
        objectiveAttemptCount,
        totalInteractionCount,
        accuracy,
        skipRate,
        averageDwellSeconds: input.averageDwellSeconds,
    };
}

export type QuestionQualityCase = {
    caseId: string;
    questionId: string;
    content: string;
    paper: { id: string; title: string } | null;
    isEscalated: boolean;
    updatedAt: Date;
    reports: Array<{
        reporterId: string;
        category: ReportCategoryValue;
        updatedAt: Date;
    }>;
};

export type QuestionQualityInteraction = {
    questionId: string;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    averageDwellSeconds: number | null;
};

export type QuestionQualityRow = {
    questionId: string;
    caseId: string;
    content: string;
    paper: { id: string; title: string } | null;
    openCaseCount: number;
    isEscalated: boolean;
    uniqueReporterCount: number;
    reportCount: number;
    topCategories: Array<{ category: ReportCategoryValue; count: number }>;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    objectiveAttemptCount: number;
    totalInteractionCount: number;
    accuracy: number | null;
    skipRate: number | null;
    averageDwellSeconds: number | null;
    sampleBand: QuestionQualitySampleBand;
    lastReportedAt: Date;
};

function roundedPercent(numerator: number, denominator: number) {
    return denominator === 0
        ? null
        : Number(((numerator / denominator) * 100).toFixed(1));
}

/**
 * Merges versioned moderation cases by current question. Statistics remain
 * evidence, not an automated verdict: a difficult but valid question is not
 * marked defective simply because fewer students answer it correctly.
 */
export function buildQuestionQualityQueue(
    cases: QuestionQualityCase[],
    interactions: Map<string, QuestionQualityInteraction>
): QuestionQualityRow[] {
    const rows = new Map<
        string,
        QuestionQualityRow & {
            reporterIds: Set<string>;
            categories: Map<ReportCategoryValue, number>;
        }
    >();
    for (const moderationCase of cases) {
        const metrics = interactions.get(moderationCase.questionId) ?? {
            questionId: moderationCase.questionId,
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 0,
            averageDwellSeconds: null,
        };
        const objectiveAttemptCount = metrics.correctCount + metrics.incorrectCount;
        const totalInteractionCount = objectiveAttemptCount + metrics.skippedCount;
        const existing = rows.get(moderationCase.questionId) ?? {
            questionId: moderationCase.questionId,
            caseId: moderationCase.caseId,
            content: moderationCase.content,
            paper: moderationCase.paper,
            openCaseCount: 0,
            isEscalated: false,
            uniqueReporterCount: 0,
            reportCount: 0,
            topCategories: [],
            correctCount: metrics.correctCount,
            incorrectCount: metrics.incorrectCount,
            skippedCount: metrics.skippedCount,
            objectiveAttemptCount,
            totalInteractionCount,
            accuracy: roundedPercent(metrics.correctCount, objectiveAttemptCount),
            skipRate: roundedPercent(metrics.skippedCount, totalInteractionCount),
            averageDwellSeconds: metrics.averageDwellSeconds,
            sampleBand: getQuestionQualitySampleBand(objectiveAttemptCount),
            lastReportedAt: moderationCase.updatedAt,
            reporterIds: new Set<string>(),
            categories: new Map<ReportCategoryValue, number>(),
        };
        existing.openCaseCount += 1;
        existing.isEscalated ||= moderationCase.isEscalated;
        if (moderationCase.updatedAt > existing.lastReportedAt) {
            existing.lastReportedAt = moderationCase.updatedAt;
            existing.caseId = moderationCase.caseId;
        }
        for (const report of moderationCase.reports) {
            existing.reportCount += 1;
            existing.reporterIds.add(report.reporterId);
            existing.categories.set(
                report.category,
                (existing.categories.get(report.category) ?? 0) + 1
            );
            if (report.updatedAt > existing.lastReportedAt) {
                existing.lastReportedAt = report.updatedAt;
            }
        }
        rows.set(moderationCase.questionId, existing);
    }

    return [...rows.values()]
        .map(({ reporterIds, categories, ...row }) => ({
            ...row,
            uniqueReporterCount: reporterIds.size,
            topCategories: [...categories.entries()]
                .sort((left, right) => right[1] - left[1])
                .slice(0, 3)
                .map(([category, count]) => ({ category, count })),
        }))
        .sort(
            (left, right) =>
                Number(right.isEscalated) - Number(left.isEscalated) ||
                right.uniqueReporterCount - left.uniqueReporterCount ||
                right.reportCount - left.reportCount ||
                right.lastReportedAt.getTime() - left.lastReportedAt.getTime()
        );
}
