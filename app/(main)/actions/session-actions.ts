"use server";

import prisma from "@/lib/prisma";
import { SessionMode } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { InteractionMetrics } from "../hooks/useExamTelemetry";

export async function createExamSession(paperId: string, mode: SessionMode) {
    try
    {
        // ==========================================
        // 1. AUTHENTICATION (Real vs. Dummy)
        // ==========================================

        // ACTUAL LOGIC (Commented out for future):
        // const { userId } = auth(); 
        // if (!userId) throw new Error("Unauthorized");

        // DUMMY LOGIC (For current development):
        const dummyUserId = "dev-dummy-user-123";

        // We must ensure the dummy user actually exists in the DB, 
        // otherwise Prisma will throw a Foreign Key constraint error.
        const user = await prisma.user.upsert({
            where: { id: dummyUserId },
            update: {}, // Do nothing if exists
            create: {
                id: dummyUserId,
                email: "guest.student@example.com",
                name: "Guest Student",
                onboarded: true,
            }
        });

        // 2. Fetch all questions for this paper so we can prepopulate the interactions
        const paper = await prisma.questionPaper.findUnique({
            where: { id: paperId },
            select: {
                questions: { select: { id: true } }
            }
        });

        if (!paper) throw new Error("Question paper not found.");

        // 3. Create Session AND Bulk Insert Interactions Safely
        const session = await prisma.$transaction(async (tx) => {

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
    await prisma.$transaction([
        // Update each interaction with collected telemetry
        ...metrics.map(m =>
            prisma.questionInteraction.updateMany({
                where: { sessionId, questionId: m.questionId },
                data: {
                    selectedAnswer: m.selectedAnswer,
                    isCorrect: m.isCorrect ?? false,
                    visitCount: m.visitCount,
                    totalDwellTime: m.dwellTimeSeconds,
                    hesitationCount: m.hesitationCount,
                    isFlagged: m.isFlagged,
                    wasHinted: m.wasHinted,
                },
            })
        ),
        prisma.testSession.update({
            where: { id: sessionId },
            data: { endTime: new Date() },
        }),
    ]);

    revalidatePath("/results", "page");
    //revalidatePath(`/exam/${sessionId}/results`);
}