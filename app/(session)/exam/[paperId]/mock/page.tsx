// app/(session)/exam/[paperId]/mock/page.tsx
import prisma from "@/lib/prisma";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { notFound, redirect } from "next/navigation";
import { SessionMode } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { getCachedPaper } from "@/lib/cache";
import { Question } from "@prisma/client";

export default async function MockSessionPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { paperId } = await params;
    const { sessionId } = await searchParams;
    const user = await requireAuth();

    if (!sessionId) redirect(`/exam/${paperId}/lobby`);

    const [session, paper] = await Promise.all([
        prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id }
        }),

        // Wrap the paper fetch in the new Redis cache helper
        getCachedPaper(paperId, () =>
            prisma.questionPaper.findUnique({
                where: { id: paperId },
                include: {
                    examQuestionPaperLinks: {
                        include: { exam: { select: { name: true, duration: true } } },
                        take: 1,
                    },
                    questions: {
                        orderBy: { createdAt: "asc" }
                    },
                },
            })
        ),
    ]);

    if (!session || session.paperId !== paperId || !paper) notFound();

    // Strip every answer-revealing field before sending to the client.
    // `options` (Json) intentionally keeps its display text but we null out
    // the index-based answer fields so the client cannot derive the answer.
    const sanitizedPaper = {
        ...paper,
        questions: paper.questions.map((q: Question) => ({
            ...q,
            correctOptions: [] as number[],   // was Int[] — blank it
            exactAnswer: null,
            answerMin: null,
            answerMax: null,
            modelAnswer: null,
        })),
    };

    return (
        <ActiveSessionClient
            paper={sanitizedPaper}
            mode={SessionMode.MOCK}
            sessionId={sessionId}
            userId={session.userId}
        />
    );
}