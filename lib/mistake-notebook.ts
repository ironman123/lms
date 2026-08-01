import "server-only";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import {
    getNextMistakeReviewAt,
    MISTAKE_REPAIR_CORRECT_STREAK,
} from "@/lib/mistake-notebook-policy";
import { SessionPurpose } from "@prisma/client";

/**
 * Projects one completed session into the student's mistake notebook using
 * two set-based writes, regardless of the number of questions in the paper.
 * It runs inside the same idempotent stats transaction as processedAt.
 */
export async function projectSessionMistakes(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    occurredAt: Date,
    purpose: SessionPurpose
) {
    const interactions = await tx.questionInteraction.findMany({
        where: {
            sessionId,
            userId,
            grade: { in: ["CORRECT", "INCORRECT"] },
        },
        select: { questionId: true, grade: true },
    });

    const incorrectQuestionIds = interactions
        .filter((interaction) => interaction.grade === "INCORRECT")
        .map((interaction) => interaction.questionId);
    const correctQuestionIds = interactions
        .filter((interaction) => interaction.grade === "CORRECT")
        .map((interaction) => interaction.questionId);
    const now = new Date();
    const wrongReviewAt = getNextMistakeReviewAt({
        occurredAt,
        grade: "INCORRECT",
        purpose,
        repaired: false,
    });
    const correctReviewAt = getNextMistakeReviewAt({
        occurredAt,
        grade: "CORRECT",
        purpose,
        repaired: false,
    });

    if (incorrectQuestionIds.length > 0) {
        const rows = incorrectQuestionIds.map((questionId) => Prisma.sql`(
            ${randomUUID()},
            ${userId},
            ${questionId},
            ${sessionId},
            'ACTIVE'::"MistakeStatus",
            1,
            0,
            ${occurredAt}::timestamp(3),
            ${occurredAt}::timestamp(3),
            ${occurredAt}::timestamp(3),
            ${wrongReviewAt}::timestamp(3),
            NULL,
            ${now}::timestamp(3),
            ${now}::timestamp(3)
        )`);

        await tx.$executeRaw(Prisma.sql`
            INSERT INTO "MistakeNotebookEntry" (
                "id",
                "userId",
                "questionId",
                "lastSessionId",
                "status",
                "wrongCount",
                "correctAfterMistakeCount",
                "firstWrongAt",
                "lastWrongAt",
                "lastReviewedAt",
                "nextReviewAt",
                "repairedAt",
                "createdAt",
                "updatedAt"
            )
            VALUES ${Prisma.join(rows)}
            ON CONFLICT ("userId", "questionId")
            DO UPDATE SET
                "lastSessionId" = EXCLUDED."lastSessionId",
                "status" = 'ACTIVE'::"MistakeStatus",
                "wrongCount" = "MistakeNotebookEntry"."wrongCount" + 1,
                "correctAfterMistakeCount" = 0,
                "lastWrongAt" = EXCLUDED."lastWrongAt",
                "lastReviewedAt" = EXCLUDED."lastReviewedAt",
                "nextReviewAt" = EXCLUDED."nextReviewAt",
                "repairedAt" = NULL,
                "updatedAt" = EXCLUDED."updatedAt"
        `);
    }

    if (correctQuestionIds.length > 0) {
        await tx.$executeRaw(Prisma.sql`
            UPDATE "MistakeNotebookEntry"
            SET
                "lastSessionId" = ${sessionId},
                "correctAfterMistakeCount" =
                    "correctAfterMistakeCount" + 1,
                "status" = CASE
                    WHEN "correctAfterMistakeCount" + 1 >= ${MISTAKE_REPAIR_CORRECT_STREAK}
                        THEN 'REPAIRED'::"MistakeStatus"
                    ELSE 'ACTIVE'::"MistakeStatus"
                END,
                "lastReviewedAt" = ${occurredAt}::timestamp(3),
                "nextReviewAt" = CASE
                    WHEN "correctAfterMistakeCount" + 1 >= ${MISTAKE_REPAIR_CORRECT_STREAK}
                        THEN NULL
                    ELSE ${correctReviewAt}::timestamp(3)
                END,
                "repairedAt" = CASE
                    WHEN "correctAfterMistakeCount" + 1 >= ${MISTAKE_REPAIR_CORRECT_STREAK}
                        THEN ${occurredAt}::timestamp(3)
                    ELSE NULL
                END,
                "updatedAt" = ${now}::timestamp(3)
            WHERE "userId" = ${userId}
              AND "questionId" IN (${Prisma.join(correctQuestionIds)})
              AND "status" = 'ACTIVE'::"MistakeStatus"
        `);
    }

    return {
        incorrect: incorrectQuestionIds.length,
        correct: correctQuestionIds.length,
    };
}
