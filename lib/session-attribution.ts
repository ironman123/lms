export type SessionExamContextSource =
    | "EXPLICIT_SELECTION"
    | "AUTO_SINGLE_LINK"
    | "STANDALONE"
    | "HISTORICAL_BACKFILL"
    | "UNCLASSIFIED";

export type SessionExamAttribution =
    | {
        status: "resolved";
        examId: string | null;
        source: SessionExamContextSource;
      }
    | { status: "requires_selection"; examIds: string[] }
    | { status: "invalid" };

/**
 * Resolves an exam context without guessing. A paper with one linked exam can
 * be attributed automatically; a multi-exam paper requires an explicit user
 * choice; and a paper with no links is a valid standalone paper.
 */
export function resolveSessionExamAttribution(
    linkedExamIds: string[],
    requestedExamId?: string | null
): SessionExamAttribution {
    const uniqueExamIds = [...new Set(linkedExamIds)];
    const requested = requestedExamId?.trim() || null;

    if (requested) {
        return uniqueExamIds.includes(requested)
            ? {
                status: "resolved",
                examId: requested,
                source: "EXPLICIT_SELECTION",
              }
            : { status: "invalid" };
    }

    if (uniqueExamIds.length === 0) {
        return {
            status: "resolved",
            examId: null,
            source: "STANDALONE",
        };
    }

    if (uniqueExamIds.length === 1) {
        return {
            status: "resolved",
            examId: uniqueExamIds[0],
            source: "AUTO_SINGLE_LINK",
        };
    }

    return { status: "requires_selection", examIds: uniqueExamIds };
}
