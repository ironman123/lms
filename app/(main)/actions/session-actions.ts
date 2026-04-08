// app/(main)/actions/session-actions.ts
"use server";
import prisma from "@/lib/prisma";
import { SessionMode } from "@prisma/client";
// import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InteractionMetrics } from "../hooks/useExamTelemetry";

export async function createExamSession(paperId: string, mode: SessionMode) {
    const user = await requireAuth();
    try
    {

        // 1 Fetch all questions for this paper so we can prepopulate the interactions
        const paper = await prisma.questionPaper.findUnique({
            where: { id: paperId },
            select: {
                questions: { select: { id: true } }
            }
        });

        if (!paper) throw new Error("Question paper not found.");

        // 2. Create Session AND Bulk Insert Interactions Safely
        const session = await prisma.$transaction(async (tx) => {
            console.log("Session Mode: ", mode);
            const newSession = await tx.testSession.create({
                data: {
                    userId: user.id,
                    paperId: paperId,
                    mode: mode,
                }
            });

            // Pre-create an empty interaction state for every single question
            if (paper.questions.length > 0)
            {
                await tx.questionInteraction.createMany({
                    data: paper.questions.map((q) => ({
                        userId: user.id,
                        sessionId: newSession.id,
                        questionId: q.id,
                        isCorrect: false, // Default schema requirement
                        visitCount: 0,
                        totalDwellTime: 0,
                        hesitationCount: 0,
                        isFlagged: false,
                        wasHinted: false,
                    }))
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
        // 1. Fetch the session and all related questions with their correct answers/options
        const session = await prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id },
            include: {
                paper: {
                    include: {
                        questions: {
                            include: { options: true }
                        }
                    }
                }
            }
        });

        if (!session || !session.paper)
        {
            throw new Error("Session or Paper not found.");
        }

        const questions = session.paper.questions;
        const questionMap = new Map(questions.map(q => [q.id, q]));

        let earnedMarks = 0;
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

        // 2. Map through the frontend metrics and recalculate `isCorrect` server-side
        const verifiedMetrics = metrics.map(m => {
            const q = questionMap.get(m.questionId);
            if (!q) return m;

            let isCorrect = false;
            const answer = m.selectedAnswer;

            if (answer)
            {
                if (q.type === "MCQ")
                {
                    const correctOption = q.options.find(o => o.isCorrect);
                    isCorrect = correctOption?.id === answer;
                }
                else if (q.type === "MSQ")
                {
                    const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id).sort().join(",");
                    const selectedIds = answer.split(",").sort().join(",");
                    isCorrect = correctIds === selectedIds;
                }
                else if (q.type === "NUMERICAL")
                {
                    isCorrect = answer.trim() === q.correctAnswer?.trim();
                }
                else if (q.type === "SUBJECTIVE")
                {
                    // Subjective questions cannot be strictly auto-graded this way
                    isCorrect = false;
                }
            }

            // Tally earned marks (considering negative marking if applicable)
            if (isCorrect)
            {
                earnedMarks += q.marks;
            } else if (answer && !isCorrect && q.negativeMarks)
            {
                earnedMarks -= q.negativeMarks; // Optional: subtracts negative marks for wrong attempts
            }

            return {
                ...m,
                isCorrect // Overwrite the frontend's trust-based metric
            };
        });

        // 3. Compute final percentage score
        // Ensure we don't divide by zero if a paper has 0 total marks
        const totalScore = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;

        // 4. Save everything to the database
        await prisma.$transaction([
            // Update each interaction with collected telemetry and server-verified correctness
            ...verifiedMetrics.map(m =>
                prisma.questionInteraction.updateMany({
                    where: { sessionId, questionId: m.questionId },
                    data: {
                        selectedAnswer: m.selectedAnswer,
                        isCorrect: m.isCorrect ?? false, // Guaranteed server-side accuracy
                        visitCount: m.visitCount,
                        totalDwellTime: m.dwellTimeSeconds,
                        hesitationCount: m.hesitationCount,
                        isFlagged: m.isFlagged ?? false,
                        wasHinted: m.wasHinted ?? false,
                    },
                })
            ),
            // Lock the session and save the computed score
            prisma.testSession.update({
                where: { id: sessionId },
                data: {
                    endTime: new Date(),
                    totalScore: parseFloat(totalScore.toFixed(2)) // Save up to 2 decimal places
                },
            }),
        ]);

        revalidatePath("/results", "page");
        return { success: true };
    }
    catch (error)
    {
        console.error("Failed to complete session:", error);
        return { success: false, error: "Failed to save exam results." };
    }
}