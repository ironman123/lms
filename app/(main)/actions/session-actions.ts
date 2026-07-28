// app/(main)/actions/session-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { SessionMode } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InteractionMetrics } from "../hooks/useExamTelemetry";
import { updateUserStats } from "@/lib/stats";
import { qstash } from "@/lib/qstash";
import {
    submittedInteractionMetricsSchema,
    type InteractionPayload,
} from "@/lib/session-interactions";
import { sessionRatelimit, actionRatelimit } from "@/lib/ratelimit";
import { getSessionLaunchAccess } from "@/lib/entitlements";

export async function createExamSession(paperId: string, mode: SessionMode) {
    const user = await requireAuth();

    if (mode !== SessionMode.PRACTICE && mode !== SessionMode.MOCK)
    {
        return { success: false, error: "Unsupported session mode." };
    }

    // These checks are independent once the user is known, so do them together.
    const [launchAccess, rateLimit] = await Promise.all([
        getSessionLaunchAccess(user.id, paperId),
        sessionRatelimit.limit(user.id),
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

    const { success } = rateLimit;
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
                totalQuestions: launchAccess.questionCount,
            },
            select: { id: true },
        });

        return { success: true, sessionId: session.id };
    } catch (error)
    {
        console.error("Failed to create session:", error);
        return { success: false, error: "Failed to initialize exam environment." };
    }
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
                            select: {
                                id: true,
                                type: true,
                                difficulty: true,   // needed for stats breakdown
                                topicPath: true,    // needed for subject breakdown
                                marks: true,
                                negativeMarks: true,
                                correctOptions: true,
                                exactAnswer: true,
                                answerMin: true,
                                answerMax: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session?.paper) throw new Error("Session or paper not found.");
        if (session.endTime !== null)
        {
            return { success: false, error: "Session already submitted." };
        }

        const questionMap = new Map(
            session.paper.questions.map((q) => [q.id, q])
        );
        const submittedByQuestion = new Map(
            parsedMetrics.data
                .filter((metric) => questionMap.has(metric.questionId))
                .map((metric) => [metric.questionId, metric])
        );

        let earnedMarks = 0;
        const totalMarks = session.paper.questions.reduce(
            (sum, q) => sum + q.marks,
            0
        );

        // Iterate over authoritative paper questions so forged IDs and
        // duplicate metrics cannot affect scoring.
        const verifiedMetrics = session.paper.questions.map((q) => {
            const m = submittedByQuestion.get(q.id) ?? {
                questionId: q.id,
                selectedAnswer: null,
                visitCount: 0,
                dwellTimeSeconds: 0,
                hesitationCount: 0,
                isFlagged: false,
                isCorrect: null,
                wasHinted: false,
                confidenceLevel: null,
            };

            let isCorrect = false;
            const answer = m.selectedAnswer?.trim();

            if (answer)
            {
                if (q.type === "MCQ")
                {
                    isCorrect = q.correctOptions[0] === parseInt(answer, 10);
                } else if (q.type === "MSQ")
                {
                    const submitted = answer.split(",").map(Number).sort().join(",");
                    const correct = [...q.correctOptions].sort().join(",");
                    isCorrect = submitted === correct;
                } else if (q.type === "NUMERICAL")
                {
                    const submitted = parseFloat(answer);
                    if (!isNaN(submitted))
                    {
                        if (q.exactAnswer != null)
                        {
                            isCorrect = submitted === q.exactAnswer;
                        } else if (q.answerMin != null && q.answerMax != null)
                        {
                            isCorrect = submitted >= q.answerMin && submitted <= q.answerMax;
                        }
                    }
                }
                // SUBJECTIVE: always false — needs manual review
            }

            if (isCorrect)
            {
                earnedMarks += q.marks;
            } else if (answer && q.negativeMarks > 0)
            {
                earnedMarks -= q.negativeMarks;
            }

            return { ...m, questionId: q.id, isCorrect };
        });

        // ── Aggregate stats ───────────────────────────────────────────────────
        const attemptedCount = verifiedMetrics.filter(
            (m) => m.selectedAnswer?.trim()
        ).length;
        const correctCount = verifiedMetrics.filter((m) => m.isCorrect).length;
        const totalScore =
            totalMarks > 0
                ? parseFloat(((earnedMarks / totalMarks) * 100).toFixed(2))
                : 0;
        const accuracy =
            attemptedCount > 0
                ? parseFloat(((correctCount / attemptedCount) * 100).toFixed(2))
                : 0;
        const timeTakenSecs = Math.floor(
            (Date.now() - session.startTime.getTime()) / 1000
        );

        // ── Persist session ───────────────────────────────────────────────────
        // We handle the session update directly first.
        await prisma.testSession.update({
            where: { id: sessionId, userId: user.id },
            data: {
                endTime: new Date(),
                completedAt: new Date(),
                totalScore,
                correctCount,
                attemptedCount,
                accuracy,
                timeTakenSecs,
                avgTimePerQ:
                    attemptedCount > 0
                        ? parseFloat((timeTakenSecs / attemptedCount).toFixed(1))
                        : 0,
            },
        });

        // ── Queue Interactions (Non-blocking) ─────────────────────────────────
        const qPayload: InteractionPayload = {
            sessionId,
            userId: user.id,
            metrics: verifiedMetrics.map((m) => ({
                questionId: m.questionId,
                selectedAnswer: m.selectedAnswer ?? null,
                isCorrect: m.isCorrect ?? false,
                visitCount: m.visitCount,
                dwellTimeSeconds: m.dwellTimeSeconds,
                hesitationCount: m.hesitationCount,
                isFlagged: m.isFlagged ?? false,
                wasHinted: m.wasHinted ?? false,
                confidenceLevel: m.confidenceLevel ?? null,
            })),
        };

        await qstash.publishJSON({
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/queues/interactions`,
            body: qPayload,
            retries: 3,
        });

        // ── Update aggregate stats (non-fatal) ────────────────────────────────
        // Build the question-result array for stats using the verified metrics
        // and the question map (which has difficulty + topicPath).
        const questionResults = verifiedMetrics.map((m) => {
            const q = questionMap.get(m.questionId);
            return {
                isCorrect: m.isCorrect ?? false,
                type: q?.type ?? "MCQ",
                difficulty: q?.difficulty ?? "MEDIUM",
                topicPath: q?.topicPath ?? null,
            };
        });

        await updateUserStats({
            userId: user.id,
            examId: session.paper.examQuestionPaperLinks[0]?.examId ?? null,
            sessionScore: totalScore,
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
