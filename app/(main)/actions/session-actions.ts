// app/(main)/actions/session-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { SessionMode } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InteractionMetrics } from "../hooks/useExamTelemetry";
import { OptionJSON } from "@/types/question";

export async function createExamSession(paperId: string, mode: SessionMode) {
    const user = await requireAuth();

    try
    {
        const paper = await prisma.questionPaper.findUnique({
            where: { id: paperId },
            select: { questions: { select: { id: true } } },
        });

        if (!paper) throw new Error("Question paper not found.");

        const session = await prisma.$transaction(async (tx) => {
            const newSession = await tx.testSession.create({
                data: {
                    userId: user.id,
                    paperId,
                    mode,
                    totalQuestions: paper.questions.length,
                },
            });

            if (paper.questions.length > 0)
            {
                await tx.questionInteraction.createMany({
                    data: paper.questions.map((q) => ({
                        userId: user.id,
                        sessionId: newSession.id,
                        questionId: q.id,
                        isCorrect: false,
                        visitCount: 0,
                        totalDwellTime: 0,
                        hesitationCount: 0,
                        isFlagged: false,
                        wasHinted: false,
                    })),
                });
            }

            return newSession;
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

    try
    {
        // No more include: { options: true } — questions are self-contained now
        const session = await prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id },
            include: {
                paper: {
                    include: {
                        questions: {
                            select: {
                                id: true,
                                type: true,
                                marks: true,
                                negativeMarks: true,
                                correctOptions: true, // [2] or [0,2]
                                exactAnswer: true,
                                answerMin: true,
                                answerMax: true,
                                // modelAnswer intentionally excluded — subjective can't auto-grade
                            },
                        },
                    },
                },
            },
        });

        if (!session?.paper) throw new Error("Session or paper not found.");

        const questionMap = new Map(
            session.paper.questions.map((q) => [q.id, q])
        );

        let earnedMarks = 0;
        const totalMarks = session.paper.questions.reduce(
            (sum, q) => sum + q.marks,
            0
        );

        const verifiedMetrics = metrics.map((m) => {
            const q = questionMap.get(m.questionId);
            if (!q) return { ...m, isCorrect: false };

            let isCorrect = false;
            const answer = m.selectedAnswer?.trim();

            if (answer)
            {
                if (q.type === "MCQ")
                {
                    // answer is stored as stringified index: "2"
                    const submitted = parseInt(answer, 10);
                    isCorrect = q.correctOptions[0] === submitted;

                } else if (q.type === "MSQ")
                {
                    // answer is comma-separated indices: "0,2"
                    const submitted = answer
                        .split(",")
                        .map(Number)
                        .sort()
                        .join(",");
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
                            isCorrect =
                                submitted >= q.answerMin && submitted <= q.answerMax;
                        }
                    }
                }
                // SUBJECTIVE: always false, needs manual review
            }

            if (isCorrect)
            {
                earnedMarks += q.marks;
            } else if (answer && q.negativeMarks > 0)
            {
                earnedMarks -= q.negativeMarks;
            }

            return { ...m, isCorrect };
        });

        // Aggregate stats for TestSession
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

        // Single transaction — update all interactions + close session
        await prisma.$transaction([
            // Bulk update interactions
            // Still N updates here — we'll fix this in Phase 5 with the queue
            ...verifiedMetrics.map((m) =>
                prisma.questionInteraction.updateMany({
                    where: { sessionId, questionId: m.questionId },
                    data: {
                        selectedAnswer: m.selectedAnswer ?? null,
                        isCorrect: m.isCorrect ?? false,
                        visitCount: m.visitCount,
                        totalDwellTime: m.dwellTimeSeconds,
                        hesitationCount: m.hesitationCount,
                        isFlagged: m.isFlagged ?? false,
                        wasHinted: m.wasHinted ?? false,
                    },
                })
            ),
            // Close session with all computed stats
            prisma.testSession.update({
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
            }),
        ]);

        revalidatePath("/results");
        return { success: true };
    } catch (error)
    {
        console.error("Failed to complete session:", error);
        return { success: false, error: "Failed to save exam results." };
    }
}