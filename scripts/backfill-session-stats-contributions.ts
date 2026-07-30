import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import { processSessionStatsContribution } from "../lib/session-stats";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function snapshotFields(
    snapshot: Prisma.JsonValue | null,
    fallback: {
        type: string;
        difficulty: string;
        topicPath: string | null;
    }
) {
    if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
        return {
            type:
                typeof snapshot.type === "string"
                    ? snapshot.type
                    : fallback.type,
            difficulty:
                typeof snapshot.difficulty === "string"
                    ? snapshot.difficulty
                    : fallback.difficulty,
            topicPath:
                typeof snapshot.topicPath === "string"
                    ? snapshot.topicPath
                    : null,
        };
    }
    return fallback;
}

try {
    const sessions = await prisma.testSession.findMany({
        where: {
            status: "COMPLETED",
            completedAt: { not: null },
            statsContribution: null,
        },
        select: {
            id: true,
            userId: true,
            totalScore: true,
            timeTakenSecs: true,
            completedAt: true,
            paper: {
                select: {
                    examQuestionPaperLinks: {
                        select: { examId: true },
                        take: 1,
                    },
                },
            },
            interactions: {
                orderBy: [
                    { questionPosition: "asc" },
                    { createdAt: "asc" },
                ],
                select: {
                    isCorrect: true,
                    grade: true,
                    questionSnapshot: true,
                    question: {
                        select: {
                            type: true,
                            difficulty: true,
                            topicPath: true,
                        },
                    },
                },
            },
        },
        orderBy: { completedAt: "asc" },
    });

    console.info(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        sessionsToBackfill: sessions.length,
        interactions: sessions.reduce(
            (total, session) => total + session.interactions.length,
            0
        ),
    }, null, 2));

    if (apply) {
        for (const session of sessions) {
            if (!session.completedAt) continue;
            await prisma.sessionStatsContribution.create({
                data: {
                    sessionId: session.id,
                    userId: session.userId,
                    examId:
                        session.paper.examQuestionPaperLinks[0]?.examId ?? null,
                    payload: {
                        sessionScore: session.totalScore ?? 0,
                        timeTakenSecs: Math.max(
                            0,
                            session.timeTakenSecs ?? 0
                        ),
                        completedAt: session.completedAt.toISOString(),
                        questions: session.interactions.map((interaction) => ({
                            isCorrect: interaction.isCorrect,
                            grade: interaction.grade,
                            ...snapshotFields(
                                interaction.questionSnapshot,
                                interaction.question
                            ),
                        })),
                    },
                },
            });
        }

        for (const session of sessions) {
            const result = await processSessionStatsContribution(session.id);
            console.info(JSON.stringify({
                sessionId: session.id,
                status: result.status,
            }));
        }
    }
} finally {
    await prisma.$disconnect();
}
