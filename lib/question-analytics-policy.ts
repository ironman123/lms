export type AnalyticsInteraction = {
    questionId: string;
    grade: "CORRECT" | "INCORRECT" | "SKIPPED" | "PENDING" | "UNAVAILABLE";
    selectedAnswer: string | null;
    confidenceLevel: number | null;
    totalDwellTime: number;
};

export type DailyQuestionAnalyticsDelta = {
    interactionCount: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    pendingCount: number;
    unavailableCount: number;
    totalDwellSeconds: number;
    options: Map<string, number>;
    confidence: Map<number, { correctCount: number; incorrectCount: number }>;
};

export function buildQuestionAnalyticsDeltas(interactions: AnalyticsInteraction[]) {
    const result = new Map<string, DailyQuestionAnalyticsDelta>();
    for (const interaction of interactions) {
        const row = result.get(interaction.questionId) ?? {
            interactionCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 0,
            pendingCount: 0,
            unavailableCount: 0,
            totalDwellSeconds: 0,
            options: new Map<string, number>(),
            confidence: new Map<number, { correctCount: number; incorrectCount: number }>(),
        };
        row.interactionCount += 1;
        row.totalDwellSeconds += Math.max(0, interaction.totalDwellTime);
        if (interaction.grade === "CORRECT") row.correctCount += 1;
        if (interaction.grade === "INCORRECT") row.incorrectCount += 1;
        if (interaction.grade === "SKIPPED") row.skippedCount += 1;
        if (interaction.grade === "PENDING") row.pendingCount += 1;
        if (interaction.grade === "UNAVAILABLE") row.unavailableCount += 1;
        if (interaction.selectedAnswer) {
            row.options.set(
                interaction.selectedAnswer,
                (row.options.get(interaction.selectedAnswer) ?? 0) + 1
            );
        }
        if (
            interaction.confidenceLevel !== null &&
            (interaction.grade === "CORRECT" || interaction.grade === "INCORRECT")
        ) {
            const confidence = row.confidence.get(interaction.confidenceLevel) ?? {
                correctCount: 0,
                incorrectCount: 0,
            };
            if (interaction.grade === "CORRECT") confidence.correctCount += 1;
            else confidence.incorrectCount += 1;
            row.confidence.set(interaction.confidenceLevel, confidence);
        }
        result.set(interaction.questionId, row);
    }
    return result;
}
