import "server-only";

import { randomUUID } from "crypto";
import { Prisma, SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SubmittedInteractionMetric } from "@/lib/session-interactions";
import type {
    QuestionSnapshot,
    ResultGrade,
} from "@/lib/exam-results";
import {
    isPastSessionExpiry,
    isResumableSessionStatus,
    RESUMABLE_SESSION_STATUSES,
} from "@/lib/session-policy";

export const FINAL_INTERACTION_REVISION = Number.MAX_SAFE_INTEGER;

type PersistInteractionsResult =
    | { status: "ok"; upserted: number }
    | { status: "not_found"; upserted: 0 }
    | { status: "inactive"; upserted: 0 };

type PersistedInteractionMetric = SubmittedInteractionMetric & {
    grade?: ResultGrade;
    questionPosition?: number;
    marksAwarded?: number;
    penaltyApplied?: number;
    questionSnapshot?: QuestionSnapshot;
};

export async function persistSessionInteractions({
    sessionId,
    userId,
    metrics,
    checkpointRevision,
    requireActive = false,
    db = prisma,
}: {
    sessionId: string;
    userId: string;
    metrics: PersistedInteractionMetric[];
    checkpointRevision: number;
    requireActive?: boolean;
    db?: Prisma.TransactionClient | typeof prisma;
}): Promise<PersistInteractionsResult> {
    const session = await db.testSession.findUnique({
        where: { id: sessionId },
        select: {
            userId: true,
            paperId: true,
            endTime: true,
            status: true,
            expiresAt: true,
        },
    });

    if (!session || session.userId !== userId) {
        return { status: "not_found", upserted: 0 };
    }
    if (
        requireActive &&
        (
            session.endTime !== null ||
            !isResumableSessionStatus(session.status) ||
            isPastSessionExpiry(session.expiresAt)
        )
    ) {
        if (
            isPastSessionExpiry(session.expiresAt) &&
            isResumableSessionStatus(session.status)
        ) {
            await db.testSession.updateMany({
                where: {
                    id: sessionId,
                    status: { in: [...RESUMABLE_SESSION_STATUSES] },
                },
                data: { status: SessionStatus.EXPIRED },
            });
        }
        return { status: "inactive", upserted: 0 };
    }

    const validQuestions = await db.question.findMany({
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
    const rows = validMetrics.map((metric) => {
        const grade =
            metric.grade ??
            (metric.isCorrect ? ("CORRECT" as const) : ("SKIPPED" as const));
        const snapshot = metric.questionSnapshot
            ? JSON.stringify(metric.questionSnapshot)
            : null;

        return Prisma.sql`(
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
            ${grade}::"InteractionGrade",
            ${metric.questionPosition ?? null},
            ${metric.marksAwarded ?? 0},
            ${metric.penaltyApplied ?? 0},
            ${snapshot}::jsonb,
            ${now},
            ${now}
        )`;
    });

    // Strictly newer revisions only. Equal-revision retries are idempotent,
    // and no delayed job can overwrite the final MAX_SAFE_INTEGER snapshot.
    await db.$executeRaw(Prisma.sql`
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
            "grade",
            "questionPosition",
            "marksAwarded",
            "penaltyApplied",
            "questionSnapshot",
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
            "checkpointRevision" = EXCLUDED."checkpointRevision",
            "grade" = CASE
                WHEN EXCLUDED."questionSnapshot" IS NOT NULL
                    THEN EXCLUDED."grade"
                ELSE "QuestionInteraction"."grade"
            END,
            "questionPosition" = COALESCE(
                EXCLUDED."questionPosition",
                "QuestionInteraction"."questionPosition"
            ),
            "marksAwarded" = CASE
                WHEN EXCLUDED."questionSnapshot" IS NOT NULL
                    THEN EXCLUDED."marksAwarded"
                ELSE "QuestionInteraction"."marksAwarded"
            END,
            "penaltyApplied" = CASE
                WHEN EXCLUDED."questionSnapshot" IS NOT NULL
                    THEN EXCLUDED."penaltyApplied"
                ELSE "QuestionInteraction"."penaltyApplied"
            END,
            "questionSnapshot" = COALESCE(
                EXCLUDED."questionSnapshot",
                "QuestionInteraction"."questionSnapshot"
            )
        WHERE "QuestionInteraction"."checkpointRevision"
            < EXCLUDED."checkpointRevision"
    `);

    return { status: "ok", upserted: validMetrics.length };
}
