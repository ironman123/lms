import "server-only";

import { SessionMode, SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthSubject } from "@/lib/auth";
import { getSessionPaper } from "@/lib/session-paper";
import {
    isPastSessionExpiry,
    isResumableSessionStatus,
    RESUMABLE_SESSION_STATUSES,
} from "@/lib/session-policy";

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
                status: true,
                startTime: true,
                endTime: true,
                expiresAt: true,
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
        session.endTime !== null ||
        !isResumableSessionStatus(session.status)
    ) {
        return null;
    }

    if (isPastSessionExpiry(session.expiresAt)) {
        await prisma.testSession.updateMany({
            where: {
                id: session.id,
                status: { in: [...RESUMABLE_SESSION_STATUSES] },
            },
            data: { status: SessionStatus.EXPIRED },
        });
        return null;
    }

    if (session.status === SessionStatus.PAUSED) {
        const resumed = await prisma.testSession.updateMany({
            where: {
                id: session.id,
                status: SessionStatus.PAUSED,
                expiresAt: { gt: new Date() },
            },
            data: {
                status: SessionStatus.ACTIVE,
                pausedAt: null,
            },
        });
        if (resumed.count === 0) return null;
        session.status = SessionStatus.ACTIVE;
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
