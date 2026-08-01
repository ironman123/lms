"use server";

import { Prisma, SessionMode, SessionPurpose, SessionStatus } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sessionRatelimit } from "@/lib/ratelimit";
import { createQuestionSetSnapshot } from "@/lib/exam-results";
import { getPaperReadiness } from "@/lib/paper-readiness";
import { getSessionExpiry } from "@/lib/session-policy";

const paperIdSchema = z.string().uuid();
const REPAIR_BATCH_SIZE = 10;

export async function createTodayRepairSession(rawPaperId: string) {
    const user = await requireAuth();
    const parsedPaperId = paperIdSchema.safeParse(rawPaperId);
    if (!parsedPaperId.success) {
        return { success: false, error: "Invalid paper." };
    }
    const paperId = parsedPaperId.data;
    const now = new Date();

    await prisma.testSession.updateMany({
        where: {
            userId: user.id,
            paperId,
            mode: SessionMode.DIAGNOSTIC,
            purpose: SessionPurpose.DAILY_REPAIR,
            status: SessionStatus.ACTIVE,
            expiresAt: { lte: now },
        },
        data: { status: SessionStatus.EXPIRED },
    });

    const existing = await prisma.testSession.findFirst({
        where: {
            userId: user.id,
            paperId,
            mode: SessionMode.DIAGNOSTIC,
            purpose: SessionPurpose.DAILY_REPAIR,
            OR: [
                { status: SessionStatus.ACTIVE, expiresAt: { gt: now } },
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
            paperId,
            resumed: true,
        };
    }

    const candidates = await prisma.mistakeNotebookEntry.findMany({
        where: {
            userId: user.id,
            status: "ACTIVE",
            nextReviewAt: { lte: now },
            question: {
                paperId,
                isArchived: false,
                isCancelled: false,
                paper: {
                    is: { isArchived: false, status: "PUBLISHED" },
                },
            },
        },
        select: {
            wrongCount: true,
            nextReviewAt: true,
            question: {
                select: {
                    id: true,
                    contentRevision: true,
                    content: true,
                    type: true,
                    difficulty: true,
                    topicPath: true,
                    marks: true,
                    negativeMarks: true,
                    explanation: true,
                    isCancelled: true,
                    options: true,
                    correctOptions: true,
                    exactAnswer: true,
                    answerMin: true,
                    answerMax: true,
                    modelAnswer: true,
                },
            },
        },
        orderBy: [{ nextReviewAt: "asc" }, { wrongCount: "desc" }],
        take: REPAIR_BATCH_SIZE * 3,
    });
    const questions = candidates
        .map((candidate) => candidate.question)
        .filter((question) => getPaperReadiness([question]).ready)
        .slice(0, REPAIR_BATCH_SIZE);

    if (questions.length === 0) {
        return {
            success: false,
            error: "No repair questions from this paper are due today.",
        };
    }

    const limit = await sessionRatelimit.limit(user.id);
    if (!limit.success) {
        return {
            success: false,
            error: "You are starting sessions too quickly. Please wait a moment.",
        };
    }

    try {
        const session = await prisma.testSession.create({
            data: {
                userId: user.id,
                paperId,
                mode: SessionMode.DIAGNOSTIC,
                purpose: SessionPurpose.DAILY_REPAIR,
                status: SessionStatus.ACTIVE,
                expiresAt: getSessionExpiry(SessionMode.DIAGNOSTIC, 60, now),
                totalQuestions: questions.length,
                examId: null,
                examContextSource: "UNCLASSIFIED",
                questionSetSnapshot: createQuestionSetSnapshot(
                    questions
                ) as unknown as Prisma.InputJsonValue,
            },
            select: { id: true },
        });
        return {
            success: true,
            sessionId: session.id,
            paperId,
            resumed: false,
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const concurrent = await prisma.testSession.findFirst({
                where: {
                    userId: user.id,
                    paperId,
                    mode: SessionMode.DIAGNOSTIC,
                    purpose: SessionPurpose.DAILY_REPAIR,
                    status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] },
                },
                select: { id: true },
                orderBy: { startTime: "desc" },
            });
            if (concurrent) {
                return {
                    success: true,
                    sessionId: concurrent.id,
                    paperId,
                    resumed: true,
                };
            }
        }
        return { success: false, error: "Unable to start today’s repair." };
    }
}
