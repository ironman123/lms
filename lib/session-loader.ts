import "server-only";

import { SessionMode, SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthSubject } from "@/lib/auth";
import { getSessionPaper } from "@/lib/session-paper";
import type { SessionPaper } from "@/lib/session-paper";
import {
    parseQuestionSetSnapshot,
    type SessionQuestionSnapshot,
} from "@/lib/exam-results";
import {
    isPastSessionExpiry,
    isResumableSessionStatus,
    RESUMABLE_SESSION_STATUSES,
} from "@/lib/session-policy";

export type ActiveSessionPaper = Omit<SessionPaper, "questions"> & {
    questions: SessionQuestionSnapshot[];
};

export async function isOwnedCompletedSession(
    sessionId: string,
    paperId: string,
    expectedMode: SessionMode
) {
    const supabaseId = await requireAuthSubject();
    const completedSession = await prisma.testSession.findFirst({
        where: {
            id: sessionId,
            paperId,
            mode: expectedMode,
            status: SessionStatus.COMPLETED,
            endTime: { not: null },
            user: { supabaseId },
        },
        select: { id: true },
    });

    return completedSession !== null;
}

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
                pausedAt: true,
                pausedDurationSecs: true,
                questionSetSnapshot: true,
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
                contentReports: {
                    where: { withdrawnAt: null },
                    select: {
                        id: true,
                        moderationCase: {
                            select: { questionId: true },
                        },
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

    if (session.status === SessionStatus.PAUSED) {
        const now = new Date();
        const pausedSeconds = session.pausedAt
            ? Math.max(
                0,
                Math.floor(
                    (now.getTime() - session.pausedAt.getTime()) / 1000
                )
            )
            : 0;
        const resumedExpiry =
            session.pausedAt && session.expiresAt
                ? new Date(
                    session.expiresAt.getTime() + pausedSeconds * 1000
                )
                : session.expiresAt;
        const resumed = await prisma.testSession.updateMany({
            where: {
                id: session.id,
                status: SessionStatus.PAUSED,
            },
            data: {
                status: SessionStatus.ACTIVE,
                pausedAt: null,
                expiresAt: resumedExpiry,
                pausedDurationSecs: { increment: pausedSeconds },
            },
        });
        if (resumed.count === 0) return null;
        session.status = SessionStatus.ACTIVE;
        session.pausedAt = null;
        session.pausedDurationSecs += pausedSeconds;
        session.expiresAt = resumedExpiry;
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

    const { interactions, ...sessionMetadata } = session;
    const frozenQuestions = parseQuestionSetSnapshot(
        session.questionSetSnapshot
    );
    const activePaper: ActiveSessionPaper = {
        ...paper,
        questions:
            frozenQuestions ??
            paper.questions.map((question) => ({
                id: question.id,
                version: 1 as const,
                contentRevision: question.contentRevision,
                content: question.content,
                type: question.type,
                difficulty: question.difficulty,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                explanation: question.explanation,
                topicPath: question.topicPath,
                options: question.options,
                correctOptions: question.correctOptions,
                exactAnswer: question.exactAnswer,
                answerMin: question.answerMin,
                answerMax: question.answerMax,
                modelAnswer: question.modelAnswer,
            })),
    };

    return {
        session: sessionMetadata,
        paper: activePaper,
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
        reportIdsByQuestion: Object.fromEntries(
            session.contentReports
                .filter(
                    (report) =>
                        typeof report.moderationCase.questionId === "string"
                )
                .map((report) => [
                    report.moderationCase.questionId!,
                    report.id,
                ])
        ),
    };
}
