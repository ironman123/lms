// app/(main)/actions/session-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { Prisma, SessionMode, SessionStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InteractionMetrics } from "../hooks/useExamTelemetry";
import { updateUserStats } from "@/lib/stats";
import { submittedInteractionMetricsSchema } from "@/lib/session-interactions";
import {
    calculateSessionResult,
    createQuestionSetSnapshot,
    parseQuestionSetSnapshot,
} from "@/lib/exam-results";
import {
    FINAL_INTERACTION_REVISION,
    persistSessionInteractions,
} from "@/lib/interaction-repository";
import { sessionRatelimit, actionRatelimit } from "@/lib/ratelimit";
import { getSessionLaunchAccess } from "@/lib/entitlements";
import {
    getSessionExpiry,
    isPastSessionExpiry,
    RESUMABLE_SESSION_STATUSES,
} from "@/lib/session-policy";

export async function createExamSession(paperId: string, mode: SessionMode) {
    const user = await requireAuth();

    if (mode !== SessionMode.PRACTICE && mode !== SessionMode.MOCK)
    {
        return { success: false, error: "Unsupported session mode." };
    }

    const now = new Date();
    const launchAccessPromise = getSessionLaunchAccess(user.id, paperId);

    // Clear expired attempts first so the partial unique index can safely
    // permit a new resumable session for this user/paper/mode.
    await prisma.testSession.updateMany({
        where: {
            userId: user.id,
            paperId,
            mode,
            status: SessionStatus.ACTIVE,
            expiresAt: { lte: now },
        },
        data: { status: SessionStatus.EXPIRED },
    });

    const [launchAccess, resumableSession] = await Promise.all([
        launchAccessPromise,
        prisma.testSession.findFirst({
            where: {
                userId: user.id,
                paperId,
                mode,
                OR: [
                    {
                        status: SessionStatus.ACTIVE,
                        expiresAt: { gt: now },
                    },
                    { status: SessionStatus.PAUSED },
                ],
            },
            select: { id: true },
            orderBy: { startTime: "desc" },
        }),
    ]);

    if (!launchAccess.exists)
    {
        return { success: false, error: "Question paper not found." };
    }
    if (!launchAccess.allowed)
    {
        return {
            success: false,
            error: "PAYMENT_REQUIRED",
            bundleId: launchAccess.bundleId,
        };
    }
    if (launchAccess.questionCount === 0)
    {
        return { success: false, error: "This paper has no questions." };
    }

    if (resumableSession)
    {
        return {
            success: true,
            sessionId: resumableSession.id,
            resumed: true,
        };
    }

    const { success } = await sessionRatelimit.limit(user.id);
    if (!success)
    {
        return {
            success: false,
            error: "You are creating too many sessions. Please wait a few minutes."
        };
    }

    try
    {
        // Only the lightweight session row blocks navigation. Interaction rows
        // are bulk-upserted after submission.
        const session = await prisma.testSession.create({
            data: {
                userId: user.id,
                paperId,
                mode,
                status: SessionStatus.ACTIVE,
                expiresAt: getSessionExpiry(
                    mode,
                    launchAccess.durationMinutes,
                    now
                ),
                totalQuestions: launchAccess.questionCount,
                questionSetSnapshot: createQuestionSetSnapshot(
                    launchAccess.questions
                ) as unknown as Prisma.InputJsonValue,
            },
            select: { id: true },
        });

        return { success: true, sessionId: session.id, resumed: false };
    } catch (error)
    {
        // Concurrent double-clicks are collapsed by the partial unique index.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const existing = await prisma.testSession.findFirst({
                where: {
                    userId: user.id,
                    paperId,
                    mode,
                    OR: [
                        {
                            status: SessionStatus.ACTIVE,
                            expiresAt: { gt: new Date() },
                        },
                        { status: SessionStatus.PAUSED },
                    ],
                },
                select: { id: true },
                orderBy: { startTime: "desc" },
            });
            if (existing) {
                return {
                    success: true,
                    sessionId: existing.id,
                    resumed: true,
                };
            }
        }

        console.error("Failed to create session:", error);
        return { success: false, error: "Failed to initialize exam environment." };
    }
}

export async function pauseExamSession(sessionId: string) {
    const user = await requireAuth();
    const { success } = await actionRatelimit.limit(`pause_${user.id}`);
    if (!success) return { success: false, error: "Too many requests." };

    const now = new Date();
    const result = await prisma.testSession.updateMany({
        where: {
            id: sessionId,
            userId: user.id,
            status: SessionStatus.ACTIVE,
            expiresAt: { gt: now },
        },
        data: {
            status: SessionStatus.PAUSED,
            pausedAt: now,
            lastCheckpointAt: now,
        },
    });

    if (result.count === 0) {
        await prisma.testSession.updateMany({
            where: {
                id: sessionId,
                userId: user.id,
                status: { in: [...RESUMABLE_SESSION_STATUSES] },
                expiresAt: { lte: now },
            },
            data: { status: SessionStatus.EXPIRED },
        });
        return {
            success: false,
            error: "This session can no longer be paused.",
        };
    }

    revalidatePath("/library/paper");
    return { success: true };
}

export async function abandonExamSession(
    sessionId: string,
    reason = "Student abandoned the attempt"
) {
    const user = await requireAuth();
    const { success } = await actionRatelimit.limit(`abandon_${user.id}`);
    if (!success) return { success: false, error: "Too many requests." };

    const now = new Date();
    const cleanReason = reason.trim().slice(0, 500) || "Student abandoned the attempt";
    const result = await prisma.testSession.updateMany({
        where: {
            id: sessionId,
            userId: user.id,
            status: { in: [...RESUMABLE_SESSION_STATUSES] },
        },
        data: {
            status: SessionStatus.ABANDONED,
            abandonedAt: now,
            abandonReason: cleanReason,
            expiresAt: now,
        },
    });

    if (result.count === 0) {
        return {
            success: false,
            error: "This session can no longer be abandoned.",
        };
    }

    revalidatePath("/library/paper");
    return { success: true };
}

export async function resumeExamSession(sessionId: string) {
    const user = await requireAuth();
    const now = new Date();

    await prisma.testSession.updateMany({
        where: {
            id: sessionId,
            userId: user.id,
            status: SessionStatus.ACTIVE,
            expiresAt: { lte: now },
        },
        data: { status: SessionStatus.EXPIRED },
    });

    const session = await prisma.testSession.findFirst({
        where: {
            id: sessionId,
            userId: user.id,
            OR: [
                {
                    status: SessionStatus.ACTIVE,
                    expiresAt: { gt: now },
                },
                { status: SessionStatus.PAUSED },
            ],
        },
        select: {
            id: true,
            paperId: true,
            mode: true,
            pausedAt: true,
            expiresAt: true,
        },
    });

    if (!session) {
        return {
            success: false,
            error: "This session has expired or is no longer resumable.",
        };
    }

    const pausedSeconds = session.pausedAt
        ? Math.max(
            0,
            Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
        )
        : 0;
    const resumedExpiry =
        session.pausedAt && session.expiresAt
            ? new Date(session.expiresAt.getTime() + pausedSeconds * 1000)
            : session.expiresAt;

    const resumed = await prisma.testSession.updateMany({
        where: {
            id: session.id,
            userId: user.id,
            OR: [
                {
                    status: SessionStatus.ACTIVE,
                    expiresAt: { gt: now },
                },
                { status: SessionStatus.PAUSED },
            ],
        },
        data: {
            status: SessionStatus.ACTIVE,
            pausedAt: null,
            expiresAt: resumedExpiry,
            pausedDurationSecs: {
                increment: pausedSeconds,
            },
        },
    });

    if (resumed.count === 0) {
        return {
            success: false,
            error: "This session changed state and can no longer be resumed.",
        };
    }

    return {
        success: true,
        sessionId: session.id,
        paperId: session.paperId,
        mode: session.mode,
    };
}

export async function completeExamSession(
    sessionId: string,
    metrics: InteractionMetrics[]
) {
    const user = await requireAuth();
    const { success } = await actionRatelimit.limit(`submit_${user.id}`);
    if (!success) return { success: false, error: "Too many submissions." };

    try
    {
        const parsedMetrics = submittedInteractionMetricsSchema.safeParse(metrics);
        if (!parsedMetrics.success)
        {
            return { success: false, error: "Invalid session metrics." };
        }

        const session = await prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id },
            include: {
                paper: {
                    include: {
                        // Take the first linked exam so we can update UserExamStats
                        examQuestionPaperLinks: {
                            select: { examId: true },
                            take: 1,
                        },
                        questions: {
                            orderBy: { createdAt: "asc" },
                            select: {
                                id: true,
                                content: true,
                                type: true,
                                difficulty: true,
                                topicPath: true,
                                marks: true,
                                negativeMarks: true,
                                explanation: true,
                                options: true,
                                correctOptions: true,
                                exactAnswer: true,
                                answerMin: true,
                                answerMax: true,
                                modelAnswer: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session?.paper) throw new Error("Session or paper not found.");
        if (session.endTime !== null || session.status === SessionStatus.COMPLETED)
        {
            return { success: false, error: "Session already submitted." };
        }
        const now = new Date();
        const expiryGraceCutoff = new Date(now.getTime() - 60_000);
        const isWithinSubmissionWindow =
            (session.status === SessionStatus.ACTIVE ||
                session.status === SessionStatus.EXPIRED) &&
            (!session.expiresAt ||
                session.expiresAt.getTime() > expiryGraceCutoff.getTime());
        if (!isWithinSubmissionWindow) {
            if (isPastSessionExpiry(session.expiresAt)) {
                await prisma.testSession.updateMany({
                    where: {
                        id: sessionId,
                        userId: user.id,
                        status: { in: [...RESUMABLE_SESSION_STATUSES] },
                    },
                    data: { status: SessionStatus.EXPIRED },
                });
            }
            return {
                success: false,
                error: "This session is not active.",
            };
        }

        const frozenQuestions = parseQuestionSetSnapshot(
            session.questionSetSnapshot
        );
        const result = calculateSessionResult(
            frozenQuestions ?? session.paper.questions,
            parsedMetrics.data
        );
        // Iterate over authoritative paper questions so forged IDs and
        // duplicate metrics cannot affect scoring.
        // ── Aggregate stats ───────────────────────────────────────────────────
        const timeTakenSecs = Math.max(
            0,
            Math.floor(
                (now.getTime() - session.startTime.getTime()) / 1000
            ) - session.pausedDurationSecs
        );

        // ── Persist session ───────────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {
            const completed = await tx.testSession.updateMany({
                where: {
                    id: sessionId,
                    userId: user.id,
                    status: {
                        in: [SessionStatus.ACTIVE, SessionStatus.EXPIRED],
                    },
                    endTime: null,
                    expiresAt: { gt: expiryGraceCutoff },
                },
                data: {
                    endTime: now,
                    completedAt: now,
                    status: SessionStatus.COMPLETED,
                    totalScore: result.totalScore,
                    earnedMarks: result.earnedMarks,
                    maximumMarks: result.maximumMarks,
                    penaltyMarks: result.penaltyMarks,
                    pendingReviewCount: result.pendingReviewCount,
                    totalQuestions: result.totalQuestions,
                    correctCount: result.correctCount,
                    attemptedCount: result.attemptedCount,
                    accuracy: result.accuracy,
                    timeTakenSecs,
                    avgTimePerQ:
                        result.attemptedCount > 0
                            ? parseFloat(
                                (
                                    timeTakenSecs / result.attemptedCount
                                ).toFixed(1)
                            )
                            : 0,
                },
            });
            if (completed.count === 0) {
                throw new Error(
                    "This session changed state before it could be submitted."
                );
            }

            const persisted = await persistSessionInteractions({
                sessionId,
                userId: user.id,
                metrics: result.metrics,
                checkpointRevision: FINAL_INTERACTION_REVISION,
                db: tx,
            });
            if (
                persisted.status !== "ok" ||
                persisted.upserted !== result.totalQuestions
            ) {
                throw new Error(
                    "The complete question review could not be persisted."
                );
            }
        });

        // ── Update aggregate stats (non-fatal) ────────────────────────────────
        const questionResults = result.metrics.map((metric) => {
            const snapshot = metric.questionSnapshot;
            return {
                isCorrect: metric.isCorrect,
                grade: metric.grade,
                type: snapshot.type,
                difficulty: snapshot.difficulty,
                topicPath: snapshot.topicPath,
            };
        });

        await updateUserStats({
            userId: user.id,
            examId: session.paper.examQuestionPaperLinks[0]?.examId ?? null,
            sessionScore: result.totalScore,
            timeTakenSecs,
            questions: questionResults,
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error)
    {
        console.error("Failed to complete session:", error);
        return { success: false, error: "Failed to save exam results." };
    }
}
