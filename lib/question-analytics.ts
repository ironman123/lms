import "server-only";

import { randomUUID } from "crypto";
import { Prisma, SessionPurpose, SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { toAppDateKey } from "@/lib/date-utils";
import { buildQuestionAnalyticsDeltas } from "@/lib/question-analytics-policy";

export async function processSessionQuestionAnalytics(sessionId: string) {
    return prisma.$transaction(async (tx) => {
        const contribution = await tx.questionAnalyticsContribution.upsert({
            where: { sessionId }, create: { sessionId }, update: {},
            select: { id: true, processedAt: true },
        });
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`;
        const locked = await tx.questionAnalyticsContribution.findUnique({
            where: { id: contribution.id }, select: { processedAt: true },
        });
        if (locked?.processedAt) return { status: "already_processed" as const };
        const session = await tx.testSession.findUnique({
            where: { id: sessionId },
            select: { status: true, purpose: true, completedAt: true, interactions: { select: { questionId: true, grade: true, selectedAnswer: true, confidenceLevel: true, totalDwellTime: true } } },
        });
        if (!session || session.status !== SessionStatus.COMPLETED || session.purpose !== SessionPurpose.STANDARD || !session.completedAt) {
            return { status: "not_eligible" as const };
        }
        const deltas = buildQuestionAnalyticsDeltas(session.interactions);
        const day = toAppDateKey(session.completedAt);
        const dailyRows = [...deltas.entries()].map(([questionId, delta]) =>
            Prisma.sql`(${randomUUID()}, ${questionId}, ${day}, ${delta.interactionCount}, ${delta.correctCount}, ${delta.incorrectCount}, ${delta.skippedCount}, ${delta.pendingCount}, ${delta.unavailableCount}, ${delta.totalDwellSeconds}, NOW(), NOW())`
        );
        const daily = await tx.$queryRaw<Array<{ id: string; questionId: string }>>(
            Prisma.sql`
                INSERT INTO "QuestionAnalyticsDaily" (
                    "id", "questionId", "day", "interactionCount", "correctCount",
                    "incorrectCount", "skippedCount", "pendingCount", "unavailableCount",
                    "totalDwellSeconds", "createdAt", "updatedAt"
                ) VALUES ${Prisma.join(dailyRows)}
                ON CONFLICT ("questionId", "day") DO UPDATE SET
                    "interactionCount" = "QuestionAnalyticsDaily"."interactionCount" + EXCLUDED."interactionCount",
                    "correctCount" = "QuestionAnalyticsDaily"."correctCount" + EXCLUDED."correctCount",
                    "incorrectCount" = "QuestionAnalyticsDaily"."incorrectCount" + EXCLUDED."incorrectCount",
                    "skippedCount" = "QuestionAnalyticsDaily"."skippedCount" + EXCLUDED."skippedCount",
                    "pendingCount" = "QuestionAnalyticsDaily"."pendingCount" + EXCLUDED."pendingCount",
                    "unavailableCount" = "QuestionAnalyticsDaily"."unavailableCount" + EXCLUDED."unavailableCount",
                    "totalDwellSeconds" = "QuestionAnalyticsDaily"."totalDwellSeconds" + EXCLUDED."totalDwellSeconds",
                    "updatedAt" = NOW()
                RETURNING "id", "questionId"
            `
        );
        const dailyIdByQuestion = new Map(daily.map((row) => [row.questionId, row.id]));
        const optionRows = [...deltas.entries()].flatMap(([questionId, delta]) =>
            [...delta.options.entries()].map(([selectedAnswer, selectionCount]) =>
                Prisma.sql`(${randomUUID()}, ${dailyIdByQuestion.get(questionId)!}, ${selectedAnswer}, ${selectionCount})`
            )
        );
        if (optionRows.length > 0) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO "QuestionOptionAnalyticsDaily" ("id", "dailyId", "selectedAnswer", "selectionCount")
                VALUES ${Prisma.join(optionRows)}
                ON CONFLICT ("dailyId", "selectedAnswer") DO UPDATE SET
                    "selectionCount" = "QuestionOptionAnalyticsDaily"."selectionCount" + EXCLUDED."selectionCount"
            `);
        }
        const confidenceRows = [...deltas.entries()].flatMap(([questionId, delta]) =>
            [...delta.confidence.entries()].map(([confidenceLevel, counts]) =>
                Prisma.sql`(${randomUUID()}, ${dailyIdByQuestion.get(questionId)!}, ${confidenceLevel}, ${counts.correctCount}, ${counts.incorrectCount})`
            )
        );
        if (confidenceRows.length > 0) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO "QuestionConfidenceAnalyticsDaily" ("id", "dailyId", "confidenceLevel", "correctCount", "incorrectCount")
                VALUES ${Prisma.join(confidenceRows)}
                ON CONFLICT ("dailyId", "confidenceLevel") DO UPDATE SET
                    "correctCount" = "QuestionConfidenceAnalyticsDaily"."correctCount" + EXCLUDED."correctCount",
                    "incorrectCount" = "QuestionConfidenceAnalyticsDaily"."incorrectCount" + EXCLUDED."incorrectCount"
            `);
        }
        await tx.questionAnalyticsContribution.update({ where: { id: contribution.id }, data: { processedAt: new Date(), lastError: null } });
        return { status: "processed" as const, questionCount: deltas.size };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // A large paper can touch 100 daily rows plus option/confidence rows.
        // This remains bounded per session, but exceeds Prisma's 5s default
        // against a pooled remote Postgres connection.
        timeout: 30_000,
    });
}

export async function runQuestionAnalyticsBackfill({
    dryRun = true,
    batchSize = 100,
}: { dryRun?: boolean; batchSize?: number } = {}) {
    const run = await prisma.questionAnalyticsBackfillRun.create({ data: { dryRun } });
    let examinedSessions = 0;
    let projectedSessions = 0;
    let skippedSessions = 0;
    try {
        const sessions = await prisma.testSession.findMany({
            where: {
                status: SessionStatus.COMPLETED,
                purpose: SessionPurpose.STANDARD,
                interactions: { some: {} },
                questionAnalyticsContribution: { is: null },
            },
            select: { id: true },
            orderBy: { completedAt: "asc" },
            take: Math.min(Math.max(batchSize, 1), 500),
        });
        for (const session of sessions) {
            examinedSessions += 1;
            if (dryRun) {
                projectedSessions += 1;
                continue;
            }
            const result = await processSessionQuestionAnalytics(session.id);
            if (result.status === "processed" || result.status === "already_processed") projectedSessions += 1;
            else skippedSessions += 1;
        }
        await prisma.questionAnalyticsBackfillRun.update({
            where: { id: run.id },
            data: { completedAt: new Date(), examinedSessions, projectedSessions, skippedSessions },
        });
        return { status: "completed" as const, runId: run.id, dryRun, examinedSessions, projectedSessions, skippedSessions };
    } catch (error) {
        await prisma.questionAnalyticsBackfillRun.update({
            where: { id: run.id },
            data: { completedAt: new Date(), examinedSessions, projectedSessions, skippedSessions, error: error instanceof Error ? error.message.slice(0, 2_000) : String(error) },
        });
        throw error;
    }
}

/**
 * Scheduled safety net for sessions whose synchronous projection and QStash
 * retry both failed. It includes both absent contributions and incomplete ones.
 */
export async function reconcilePendingQuestionAnalytics(limit = 50) {
    const pending = await prisma.testSession.findMany({
        where: {
            status: SessionStatus.COMPLETED,
            purpose: SessionPurpose.STANDARD,
            interactions: { some: {} },
            OR: [
                { questionAnalyticsContribution: { is: null } },
                { questionAnalyticsContribution: { is: { processedAt: null } } },
            ],
        },
        select: { id: true },
        orderBy: { completedAt: "asc" },
        take: Math.min(Math.max(limit, 1), 100),
    });
    const results: Array<
        | { sessionId: string; status: "processed" | "already_processed" | "not_eligible" }
        | { sessionId: string; status: "failed"; error: string }
    > = [];
    for (const session of pending) {
        try {
            const result = await processSessionQuestionAnalytics(session.id);
            results.push({ sessionId: session.id, ...result });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await prisma.questionAnalyticsContribution.upsert({
                where: { sessionId: session.id },
                create: { sessionId: session.id, lastError: errorMessage.slice(0, 2_000) },
                update: { lastError: errorMessage.slice(0, 2_000) },
            }).catch(() => undefined);
            results.push({ sessionId: session.id, status: "failed", error: errorMessage });
        }
    }
    return results;
}

export async function getRecentQuestionAnalyticsBackfillRuns() {
    return prisma.questionAnalyticsBackfillRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
}
