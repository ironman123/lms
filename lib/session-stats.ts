import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    aggregateFromStored,
    applyStatsContribution,
    rebuildAggregateStats,
    statsContributionPayloadSchema,
    type StatsContributionPayload,
} from "@/lib/stats-aggregation";

function errorMessage(error: unknown) {
    return (error instanceof Error ? error.message : String(error)).slice(
        0,
        2_000
    );
}

function parsePayload(payload: Prisma.JsonValue) {
    return statsContributionPayloadSchema.parse(payload);
}

async function processedPayloadsForUser(
    tx: Prisma.TransactionClient,
    userId: string,
    currentId: string
) {
    const rows = await tx.sessionStatsContribution.findMany({
        where: {
            userId,
            OR: [{ processedAt: { not: null } }, { id: currentId }],
        },
        select: { payload: true },
        orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => parsePayload(row.payload));
}

function buildExamStats(payloads: StatsContributionPayload[]) {
    return payloads.reduce(
        (result, payload) => ({
            testsAttempted: result.testsAttempted + 1,
            scoreSum: result.scoreSum + payload.sessionScore,
            bestScore: Math.max(result.bestScore, payload.sessionScore),
            prevScore: result.lastScore,
            lastScore: payload.sessionScore,
        }),
        {
            testsAttempted: 0,
            scoreSum: 0,
            bestScore: 0,
            lastScore: null as number | null,
            prevScore: null as number | null,
        }
    );
}

/**
 * Applies one durable contribution exactly once. A PostgreSQL advisory lock
 * serializes aggregate updates per user, preventing concurrent submissions
 * from losing JSON breakdown changes.
 */
export async function processSessionStatsContribution(sessionId: string) {
    try {
        return await prisma.$transaction(async (tx) => {
            const initial = await tx.sessionStatsContribution.findUnique({
                where: { sessionId },
                select: { id: true, userId: true },
            });
            if (!initial) return { status: "not_found" as const };

            await tx.$executeRaw`
                SELECT pg_advisory_xact_lock(hashtext(${initial.userId}))
            `;

            const contribution =
                await tx.sessionStatsContribution.findUnique({
                    where: { sessionId },
                });
            if (!contribution) return { status: "not_found" as const };
            if (contribution.processedAt) {
                return { status: "already_processed" as const };
            }

            const payload = parsePayload(contribution.payload);
            const [stored, processedCount] = await Promise.all([
                tx.userStats.findUnique({
                    where: { userId: contribution.userId },
                }),
                tx.sessionStatsContribution.count({
                    where: {
                        userId: contribution.userId,
                        processedAt: { not: null },
                    },
                }),
            ]);

            let aggregate;
            if (stored && stored.totalTests === processedCount) {
                aggregate = applyStatsContribution(
                    aggregateFromStored(stored),
                    payload
                );
            } else {
                const payloads = await processedPayloadsForUser(
                    tx,
                    contribution.userId,
                    contribution.id
                );
                aggregate = rebuildAggregateStats(payloads);
                // Any legacy exam aggregates without canonical contributions
                // are also non-recoverable and must be rebuilt per exam.
                await tx.userExamStats.deleteMany({
                    where: { userId: contribution.userId },
                });
            }

            await tx.userStats.upsert({
                where: { userId: contribution.userId },
                create: {
                    userId: contribution.userId,
                    ...aggregate,
                },
                update: aggregate,
            });

            if (contribution.examId) {
                const [examStored, examProcessedCount] = await Promise.all([
                    tx.userExamStats.findUnique({
                        where: {
                            userId_examId: {
                                userId: contribution.userId,
                                examId: contribution.examId,
                            },
                        },
                    }),
                    tx.sessionStatsContribution.count({
                        where: {
                            userId: contribution.userId,
                            examId: contribution.examId,
                            processedAt: { not: null },
                        },
                    }),
                ]);

                let examAggregate;
                if (
                    examStored &&
                    examStored.testsAttempted === examProcessedCount
                ) {
                    examAggregate = {
                        testsAttempted: examStored.testsAttempted + 1,
                        scoreSum:
                            examStored.scoreSum + payload.sessionScore,
                        bestScore: Math.max(
                            examStored.bestScore,
                            payload.sessionScore
                        ),
                        prevScore: examStored.lastScore,
                        lastScore: payload.sessionScore,
                    };
                } else {
                    const rows =
                        await tx.sessionStatsContribution.findMany({
                            where: {
                                userId: contribution.userId,
                                examId: contribution.examId,
                                OR: [
                                    { processedAt: { not: null } },
                                    { id: contribution.id },
                                ],
                            },
                            select: { payload: true },
                            orderBy: { createdAt: "asc" },
                        });
                    examAggregate = buildExamStats(
                        rows.map((row) => parsePayload(row.payload))
                    );
                }

                await tx.userExamStats.upsert({
                    where: {
                        userId_examId: {
                            userId: contribution.userId,
                            examId: contribution.examId,
                        },
                    },
                    create: {
                        userId: contribution.userId,
                        examId: contribution.examId,
                        ...examAggregate,
                    },
                    update: examAggregate,
                });
            }

            await tx.sessionStatsContribution.update({
                where: { id: contribution.id },
                data: {
                    processedAt: new Date(),
                    attempts: { increment: 1 },
                    lastError: null,
                },
            });
            return { status: "processed" as const };
        });
    } catch (error) {
        await prisma.sessionStatsContribution.updateMany({
            where: { sessionId, processedAt: null },
            data: {
                attempts: { increment: 1 },
                lastError: errorMessage(error),
            },
        }).catch(() => undefined);
        throw error;
    }
}

export async function reconcilePendingSessionStats(limit = 50) {
    const pending = await prisma.sessionStatsContribution.findMany({
        where: { processedAt: null },
        select: { sessionId: true },
        orderBy: { createdAt: "asc" },
        take: Math.min(Math.max(limit, 1), 100),
    });
    const results = [];
    for (const contribution of pending) {
        try {
            results.push({
                sessionId: contribution.sessionId,
                ...(await processSessionStatsContribution(
                    contribution.sessionId
                )),
            });
        } catch (error) {
            results.push({
                sessionId: contribution.sessionId,
                status: "failed" as const,
                error: errorMessage(error),
            });
        }
    }
    return results;
}

export async function enqueueSessionStatsRetry(sessionId: string) {
    const origin =
        process.env.APP_URL ??
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : null);
    if (!origin || !process.env.QSTASH_TOKEN) return false;
    const { qstash } = await import("@/lib/qstash");
    await qstash.publishJSON({
        url: `${origin}/api/queues/session-stats`,
        body: { sessionId },
    });
    return true;
}
