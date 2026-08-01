export const MISTAKE_REPAIR_CORRECT_STREAK = 2;
export const REPAIR_RETRY_DELAY_DAYS = 1;
export const REPAIR_CONFIRMATION_DELAY_DAYS = 3;

export function getNextMistakeReviewAt({
    occurredAt,
    grade,
    purpose,
    repaired,
}: {
    occurredAt: Date;
    grade: "CORRECT" | "INCORRECT";
    purpose: "STANDARD" | "DAILY_REPAIR";
    repaired: boolean;
}) {
    if (repaired) return null;
    const delayDays =
        grade === "CORRECT"
            ? REPAIR_CONFIRMATION_DELAY_DAYS
            : purpose === "DAILY_REPAIR"
                ? REPAIR_RETRY_DELAY_DAYS
                : 0;
    return new Date(occurredAt.getTime() + delayDays * 86_400_000);
}

export type MistakeProjectionState = {
    status: "ACTIVE" | "REPAIRED";
    wrongCount: number;
    correctAfterMistakeCount: number;
};

export function applyMistakeGrade(
    current: MistakeProjectionState | null,
    grade: "CORRECT" | "INCORRECT"
): MistakeProjectionState | null {
    if (grade === "INCORRECT") {
        return {
            status: "ACTIVE",
            wrongCount: (current?.wrongCount ?? 0) + 1,
            correctAfterMistakeCount: 0,
        };
    }

    if (!current || current.status === "REPAIRED") return current;
    const correctAfterMistakeCount =
        current.correctAfterMistakeCount + 1;
    return {
        ...current,
        correctAfterMistakeCount,
        status:
            correctAfterMistakeCount >= MISTAKE_REPAIR_CORRECT_STREAK
                ? "REPAIRED"
                : "ACTIVE",
    };
}
