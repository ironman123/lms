import "server-only";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SubmittedInteractionMetric } from "@/lib/session-interactions";

export const FINAL_INTERACTION_REVISION = Number.MAX_SAFE_INTEGER;

type PersistInteractionsResult =
    | { status: "ok"; upserted: number }
    | { status: "not_found"; upserted: 0 }
    | { status: "completed"; upserted: 0 };

export async function persistSessionInteractions({
    sessionId,
    userId,
    metrics,
    checkpointRevision,
    requireActive = false,
}: {
    sessionId: string;
    userId: string;
    metrics: SubmittedInteractionMetric[];
    checkpointRevision: number;
    requireActive?: boolean;
}): Promise<PersistInteractionsResult> {
    const session = await prisma.testSession.findUnique({
        where: { id: sessionId },
        select: { userId: true, paperId: true, endTime: true },
    });

    if (!session || session.userId !== userId) {
        return { status: "not_found", upserted: 0 };
    }
    if (requireActive && session.endTime !== null) {
        return { status: "completed", upserted: 0 };
    }

    const validQuestions = await prisma.question.findMany({
        where: {
            paperId: session.paperId,
            id: { in: metrics.map((metric) => metric.questionId) },
        },
        select: { id: true },
    });
    const validQuestionIds = new Set(
        validQuestions.map((question) => question.id)
    );
    const validMetrics = metrics.filter((metric) =>
        validQuestionIds.has(metric.questionId)
    );

    if (validMetrics.length === 0) {
        return { status: "ok", upserted: 0 };
    }

    const now = new Date();
    const rows = validMetrics.map((metric) => Prisma.sql`(
        ${randomUUID()},
        ${userId},
        ${metric.questionId},
        ${sessionId},
        ${metric.visitCount},
        ${metric.dwellTimeSeconds},
        ${metric.isCorrect ?? false},
        ${metric.selectedAnswer},
        ${metric.hesitationCount},
        ${metric.isFlagged},
        ${metric.wasHinted},
        ${metric.confidenceLevel},
        ${checkpointRevision},
        ${now},
        ${now}
    )`);

    // The revision guard makes concurrent interval/pagehide requests safe:
    // a late older request cannot overwrite a newer answer or flag state.
    await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "QuestionInteraction" (
            "id",
            "userId",
            "questionId",
            "sessionId",
            "visitCount",
            "totalDwellTime",
            "isCorrect",
            "selectedAnswer",
            "hesitationCount",
            "isFlagged",
            "wasHinted",
            "confidenceLevel",
            "checkpointRevision",
            "startedAt",
            "createdAt"
        )
        VALUES ${Prisma.join(rows)}
        ON CONFLICT ("userId", "questionId", "sessionId")
        DO UPDATE SET
            "visitCount" = EXCLUDED."visitCount",
            "totalDwellTime" = EXCLUDED."totalDwellTime",
            "isCorrect" = EXCLUDED."isCorrect",
            "selectedAnswer" = EXCLUDED."selectedAnswer",
            "hesitationCount" = EXCLUDED."hesitationCount",
            "isFlagged" = EXCLUDED."isFlagged",
            "wasHinted" = EXCLUDED."wasHinted",
            "confidenceLevel" = EXCLUDED."confidenceLevel",
            "checkpointRevision" = EXCLUDED."checkpointRevision"
        WHERE "QuestionInteraction"."checkpointRevision"
            <= EXCLUDED."checkpointRevision"
    `);

    return { status: "ok", upserted: validMetrics.length };
}
