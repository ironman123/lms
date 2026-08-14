import "server-only";

import { Prisma, SessionPurpose, SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseQuestionSetSnapshot } from "@/lib/exam-results";
import { FINAL_INTERACTION_REVISION } from "@/lib/interaction-repository";
import {
    interactionRetentionConfigSchema,
    mergeConfidenceCounts,
    type InteractionRetentionConfigInput,
} from "@/lib/interaction-retention-policy";

const GLOBAL_CONFIG_ID = "global";

export async function getInteractionRetentionConfig() {
    return prisma.interactionRetentionConfig.upsert({
        where: { id: GLOBAL_CONFIG_ID },
        create: { id: GLOBAL_CONFIG_ID },
        update: {},
    });
}

export async function updateInteractionRetentionConfig(
    adminId: string,
    input: InteractionRetentionConfigInput
) {
    const parsed = interactionRetentionConfigSchema.parse(input);
    return prisma.interactionRetentionConfig.upsert({
        where: { id: GLOBAL_CONFIG_ID },
        create: { id: GLOBAL_CONFIG_ID, ...parsed, updatedById: adminId },
        update: { ...parsed, updatedById: adminId },
    });
}

type RetentionSkipReason =
    | "not_eligible"
    | "incomplete_summary"
    | "incomplete_interactions"
    | "unprocessed_projection"
    | "aggregate_mismatch"
    | "mistake_projection_missing";

type RetentionSessionResult =
    | { status: "archived"; deletedInteractions: number }
    | { status: "eligible"; deletedInteractions: number }
    | { status: "skipped"; reason: RetentionSkipReason };

async function retainSession(
    sessionId: string,
    eligibleBefore: Date,
    maxDetailedSessionsPerUser: number,
    dryRun: boolean
): Promise<RetentionSessionResult> {
    return prisma.$transaction(async (tx) => {
        const session = await tx.testSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                userId: true,
                examId: true,
                purpose: true,
                status: true,
                completedAt: true,
                endTime: true,
                totalScore: true,
                earnedMarks: true,
                maximumMarks: true,
                accuracy: true,
                timeTakenSecs: true,
                totalQuestions: true,
                questionSetSnapshot: true,
                interactionsPurgedAt: true,
                statsContribution: {
                    select: { processedAt: true },
                },
                questionAnalyticsContribution: {
                    select: { processedAt: true },
                },
                interactions: {
                    orderBy: { questionPosition: "asc" },
                    select: {
                        id: true,
                        questionId: true,
                        selectedAnswer: true,
                        isCorrect: true,
                        grade: true,
                        questionPosition: true,
                        marksAwarded: true,
                        penaltyApplied: true,
                        isFlagged: true,
                        wasHinted: true,
                        confidenceLevel: true,
                        totalDwellTime: true,
                        hesitationCount: true,
                        checkpointRevision: true,
                        questionSnapshot: true,
                    },
                },
            },
        });

        if (
            !session ||
            session.status !== SessionStatus.COMPLETED ||
            session.interactionsPurgedAt ||
            !session.completedAt
        ) {
            return { status: "skipped", reason: "not_eligible" };
        }

        await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(hashtext(${session.userId}))
        `;

        const newerDetailedSessions = await tx.testSession.count({
            where: {
                userId: session.userId,
                status: SessionStatus.COMPLETED,
                completedAt: { gt: session.completedAt },
                interactionsPurgedAt: null,
                interactions: { some: {} },
            },
        });
        if (
            session.completedAt > eligibleBefore &&
            newerDetailedSessions < maxDetailedSessionsPerUser
        ) {
            return { status: "skipped", reason: "not_eligible" };
        }

        if (
            !session.endTime ||
            session.totalScore === null ||
            session.earnedMarks === null ||
            session.maximumMarks === null ||
            session.accuracy === null ||
            session.timeTakenSecs === null ||
            session.totalQuestions <= 0 ||
            parseQuestionSetSnapshot(session.questionSetSnapshot)?.length !==
                session.totalQuestions
        ) {
            return { status: "skipped", reason: "incomplete_summary" };
        }

        if (
            session.interactions.length !== session.totalQuestions ||
            session.interactions.some(
                (interaction) =>
                    interaction.checkpointRevision !==
                        BigInt(FINAL_INTERACTION_REVISION) ||
                    !interaction.questionSnapshot
            )
        ) {
            return { status: "skipped", reason: "incomplete_interactions" };
        }

        if (!session.statsContribution?.processedAt) {
            return { status: "skipped", reason: "unprocessed_projection" };
        }
        if (
            session.purpose === SessionPurpose.STANDARD &&
            !session.questionAnalyticsContribution?.processedAt
        ) {
            return { status: "skipped", reason: "unprocessed_projection" };
        }

        if (session.purpose === SessionPurpose.STANDARD) {
            const [processedCount, storedStats] = await Promise.all([
                tx.sessionStatsContribution.count({
                    where: {
                        userId: session.userId,
                        processedAt: { not: null },
                        session: { purpose: SessionPurpose.STANDARD },
                    },
                }),
                tx.userStats.findUnique({ where: { userId: session.userId } }),
            ]);
            if (!storedStats || storedStats.totalTests !== processedCount) {
                return { status: "skipped", reason: "aggregate_mismatch" };
            }
            if (session.examId) {
                const [examProcessedCount, examStats] = await Promise.all([
                    tx.sessionStatsContribution.count({
                        where: {
                            userId: session.userId,
                            examId: session.examId,
                            processedAt: { not: null },
                        },
                    }),
                    tx.userExamStats.findUnique({
                        where: {
                            userId_examId: {
                                userId: session.userId,
                                examId: session.examId,
                            },
                        },
                    }),
                ]);
                if (
                    !examStats ||
                    examStats.testsAttempted !== examProcessedCount
                ) {
                    return { status: "skipped", reason: "aggregate_mismatch" };
                }
            }
        }

        const incorrectQuestionIds = session.interactions
            .filter((interaction) => interaction.grade === "INCORRECT")
            .map((interaction) => interaction.questionId);
        if (incorrectQuestionIds.length > 0) {
            const projected = await tx.mistakeNotebookEntry.count({
                where: {
                    userId: session.userId,
                    questionId: { in: incorrectQuestionIds },
                },
            });
            if (projected !== new Set(incorrectQuestionIds).size) {
                return {
                    status: "skipped",
                    reason: "mistake_projection_missing",
                };
            }
        }

        if (dryRun) {
            return {
                status: "eligible",
                deletedInteractions: session.interactions.length,
            };
        }

        const existingArchiveStats =
            await tx.userInteractionArchiveStats.findUnique({
                where: { userId: session.userId },
            });
        const standardCorrect =
            session.purpose === SessionPurpose.STANDARD
                ? session.interactions.filter((row) => row.grade === "CORRECT")
                    .length
                : 0;
        const standardIncorrect =
            session.purpose === SessionPurpose.STANDARD
                ? session.interactions.filter((row) => row.grade === "INCORRECT")
                    .length
                : 0;
        const confidenceBuckets = mergeConfidenceCounts(
            existingArchiveStats?.confidenceBuckets,
            session.interactions
                .filter(
                    (row) =>
                        row.grade === "CORRECT" || row.grade === "INCORRECT"
                )
                .map((row) => ({
                    confidenceLevel: row.confidenceLevel,
                    isCorrect: row.isCorrect,
                }))
        );

        await tx.userInteractionArchiveStats.upsert({
            where: { userId: session.userId },
            create: {
                userId: session.userId,
                correctCount: standardCorrect,
                incorrectCount: standardIncorrect,
                confidenceBuckets,
            },
            update: {
                correctCount: { increment: standardCorrect },
                incorrectCount: { increment: standardIncorrect },
                confidenceBuckets,
            },
        });

        const archive = {
            version: 1 as const,
            interactions: session.interactions.map((interaction) => ({
                id: interaction.id,
                questionId: interaction.questionId,
                selectedAnswer: interaction.selectedAnswer,
                grade: interaction.grade,
                questionPosition: interaction.questionPosition,
                marksAwarded: interaction.marksAwarded,
                penaltyApplied: interaction.penaltyApplied,
                isFlagged: interaction.isFlagged,
                wasHinted: interaction.wasHinted,
                confidenceLevel: interaction.confidenceLevel,
                totalDwellTime: interaction.totalDwellTime,
                hesitationCount: interaction.hesitationCount,
            })),
        } satisfies Prisma.InputJsonValue;

        await tx.testSession.update({
            where: { id: session.id },
            data: {
                interactionArchive: archive,
                interactionsPurgedAt: new Date(),
            },
        });
        const deleted = await tx.questionInteraction.deleteMany({
            where: { sessionId: session.id, userId: session.userId },
        });
        if (deleted.count !== session.totalQuestions) {
            throw new Error("Interaction retention deleted an incomplete session.");
        }

        return {
            status: "archived",
            deletedInteractions: deleted.count,
        };
    });
}

export async function runInteractionRetention({
    dryRun = false,
}: { dryRun?: boolean } = {}) {
    const config = await getInteractionRetentionConfig();
    if (!config.enabled && !dryRun) {
        return { status: "disabled" as const };
    }

    const run = await prisma.interactionRetentionRun.create({ data: { dryRun } });
    let examinedSessions = 0;
    let archivedSessions = 0;
    let deletedInteractions = 0;
    let skippedSessions = 0;

    try {
        const eligibleBefore = new Date(
            Date.now() - config.retentionDays * 86_400_000
        );
        const candidates = await prisma.testSession.findMany({
            where: {
                status: SessionStatus.COMPLETED,
                completedAt: { not: null },
                interactionsPurgedAt: null,
                interactions: { some: {} },
            },
            select: { id: true },
            orderBy: { completedAt: "asc" },
            take: Math.min(config.batchSize * 10, 2_000),
        });

        for (const candidate of candidates) {
            if (archivedSessions >= config.batchSize) break;
            examinedSessions++;
            const result = await retainSession(
                candidate.id,
                eligibleBefore,
                config.maxDetailedSessionsPerUser,
                dryRun
            );
            if (result.status === "archived" || result.status === "eligible") {
                archivedSessions++;
                deletedInteractions += result.deletedInteractions;
            } else {
                skippedSessions++;
            }
        }

        await prisma.interactionRetentionRun.update({
            where: { id: run.id },
            data: {
                completedAt: new Date(),
                examinedSessions,
                archivedSessions,
                deletedInteractions,
                skippedSessions,
            },
        });
        return {
            status: "completed" as const,
            runId: run.id,
            dryRun,
            examinedSessions,
            archivedSessions,
            deletedInteractions,
            skippedSessions,
        };
    } catch (error) {
        await prisma.interactionRetentionRun.update({
            where: { id: run.id },
            data: {
                completedAt: new Date(),
                examinedSessions,
                archivedSessions,
                deletedInteractions,
                skippedSessions,
                error: error instanceof Error ? error.message.slice(0, 2_000) : String(error),
            },
        });
        throw error;
    }
}

export async function getRecentInteractionRetentionRuns() {
    return prisma.interactionRetentionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 20,
    });
}
