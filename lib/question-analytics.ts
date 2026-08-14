import "server-only";

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
        for (const [questionId, delta] of deltas) {
            const daily = await tx.questionAnalyticsDaily.upsert({
                where: { questionId_day: { questionId, day } },
                create: { questionId, day, interactionCount: delta.interactionCount, correctCount: delta.correctCount, incorrectCount: delta.incorrectCount, skippedCount: delta.skippedCount, pendingCount: delta.pendingCount, unavailableCount: delta.unavailableCount, totalDwellSeconds: delta.totalDwellSeconds },
                update: { interactionCount: { increment: delta.interactionCount }, correctCount: { increment: delta.correctCount }, incorrectCount: { increment: delta.incorrectCount }, skippedCount: { increment: delta.skippedCount }, pendingCount: { increment: delta.pendingCount }, unavailableCount: { increment: delta.unavailableCount }, totalDwellSeconds: { increment: delta.totalDwellSeconds } },
                select: { id: true },
            });
            for (const [selectedAnswer, selectionCount] of delta.options) {
                await tx.questionOptionAnalyticsDaily.upsert({
                    where: { dailyId_selectedAnswer: { dailyId: daily.id, selectedAnswer } },
                    create: { dailyId: daily.id, selectedAnswer, selectionCount },
                    update: { selectionCount: { increment: selectionCount } },
                });
            }
            for (const [confidenceLevel, counts] of delta.confidence) {
                await tx.questionConfidenceAnalyticsDaily.upsert({
                    where: { dailyId_confidenceLevel: { dailyId: daily.id, confidenceLevel } },
                    create: { dailyId: daily.id, confidenceLevel, ...counts },
                    update: { correctCount: { increment: counts.correctCount }, incorrectCount: { increment: counts.incorrectCount } },
                });
            }
        }
        await tx.questionAnalyticsContribution.update({ where: { id: contribution.id }, data: { processedAt: new Date(), lastError: null } });
        return { status: "processed" as const, questionCount: deltas.size };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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

export async function getRecentQuestionAnalyticsBackfillRuns() {
    return prisma.questionAnalyticsBackfillRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
}
