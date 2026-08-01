export type ConfidenceBucket = {
    confidenceLevel: number;
    isCorrect: boolean;
    count: number;
};

export type ConfidenceCalibration = {
    sampleCount: number;
    averageConfidence: number;
    accuracy: number;
    calibrationGap: number;
    highConfidenceWrong: number;
    lowConfidenceCorrect: number;
    status: "CALIBRATED" | "OVERCONFIDENT" | "UNDERCONFIDENT";
};

export function confidenceBand(level: number) {
    if (level >= 90) return "Certain";
    if (level >= 70) return "Sure";
    if (level >= 45) return "Unsure";
    return "Guess";
}

export function calculateConfidenceCalibration(
    buckets: ConfidenceBucket[]
): ConfidenceCalibration | null {
    const sampleCount = buckets.reduce(
        (sum, bucket) => sum + bucket.count,
        0
    );
    if (sampleCount === 0) return null;

    const confidenceSum = buckets.reduce(
        (sum, bucket) =>
            sum + bucket.confidenceLevel * bucket.count,
        0
    );
    const correct = buckets.reduce(
        (sum, bucket) =>
            sum + (bucket.isCorrect ? bucket.count : 0),
        0
    );
    const averageConfidence = confidenceSum / sampleCount;
    const accuracy = (correct / sampleCount) * 100;
    const calibrationGap = averageConfidence - accuracy;

    return {
        sampleCount,
        averageConfidence,
        accuracy,
        calibrationGap,
        highConfidenceWrong: buckets
            .filter(
                (bucket) =>
                    !bucket.isCorrect && bucket.confidenceLevel >= 75
            )
            .reduce((sum, bucket) => sum + bucket.count, 0),
        lowConfidenceCorrect: buckets
            .filter(
                (bucket) =>
                    bucket.isCorrect && bucket.confidenceLevel <= 50
            )
            .reduce((sum, bucket) => sum + bucket.count, 0),
        status:
            calibrationGap > 10
                ? "OVERCONFIDENT"
                : calibrationGap < -10
                    ? "UNDERCONFIDENT"
                    : "CALIBRATED",
    };
}
