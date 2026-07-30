import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, child]) => child !== undefined)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, child]) => [key, canonicalize(child)])
        );
    }
    return value;
}

export function hashModerationSnapshot(snapshot: unknown) {
    return createHash("sha256")
        .update(JSON.stringify(canonicalize(snapshot)))
        .digest("hex");
}

export function buildQuestionCaseKey(questionId: string, snapshotHash: string) {
    return `QUESTION:${questionId}:${snapshotHash}`;
}

export function buildPaperCaseKey(paperId: string, snapshotHash: string) {
    return `PAPER:${paperId}:${snapshotHash}`;
}

export function shouldEscalate(uniqueReporterCount: number, threshold: number) {
    return uniqueReporterCount >= threshold;
}
