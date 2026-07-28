import "server-only";

import { SessionMode } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthSubject } from "@/lib/auth";
import { getSessionPaper } from "@/lib/session-paper";

export async function loadActiveSession(
    sessionId: string,
    paperId: string,
    expectedMode: SessionMode
) {
    // Authentication, ownership metadata, and paper loading are independent.
    // Running them together removes two serialized waits from navigation.
    const [supabaseId, session, paper] = await Promise.all([
        requireAuthSubject(),
        prisma.testSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                userId: true,
                paperId: true,
                mode: true,
                startTime: true,
                endTime: true,
                user: { select: { supabaseId: true } },
                interactions: {
                    select: {
                        questionId: true,
                        selectedAnswer: true,
                        visitCount: true,
                        totalDwellTime: true,
                        hesitationCount: true,
                        isFlagged: true,
                        isCorrect: true,
                        wasHinted: true,
                        confidenceLevel: true,
                        checkpointRevision: true,
                    },
                },
            },
        }),
        getSessionPaper(paperId),
    ]);

    if (
        !session ||
        !paper ||
        session.user.supabaseId !== supabaseId ||
        session.paperId !== paperId ||
        session.mode !== expectedMode ||
        session.endTime !== null
    ) {
        return null;
    }

    const { interactions, ...sessionMetadata } = session;

    return {
        session: sessionMetadata,
        paper,
        restoredInteractions: interactions.map((interaction) => ({
            questionId: interaction.questionId,
            selectedAnswer: interaction.selectedAnswer,
            visitCount: interaction.visitCount,
            dwellTimeSeconds: interaction.totalDwellTime,
            hesitationCount: interaction.hesitationCount,
            isFlagged: interaction.isFlagged,
            isCorrect: interaction.isCorrect,
            wasHinted: interaction.wasHinted,
            confidenceLevel: interaction.confidenceLevel,
            checkpointRevision: Number(interaction.checkpointRevision),
        })),
    };
}
