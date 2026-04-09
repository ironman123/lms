// mock/page.tsx
import prisma from "@/lib/prisma";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { SessionMode } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

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
        prisma.testSession.findUnique({ where: { id: sessionId, userId: user.id } }),
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                questions: {
                    orderBy: { createdAt: "asc" },
                    include: { options: true },
                },
                examQuestionPaperLinks: {
                    include: {
                        exam: {
                            select: { duration: true }
                        }
                    }
                }
            },
        }),
    ]);

    if (!session || session.paperId !== paperId || !paper)
    {
        notFound();
    }

    const sanitizedPaper = {
        ...paper,
        questions: paper.questions.map(q => ({
            ...q,
            correctAnswer: null,      // ← never leak to client during mock
            options: q.options.map(o => ({
                ...o,
                isCorrect: false,     // ← strip this too
            }))
        }))
    };



    if (!session || session.paperId !== paperId || !paper) notFound();

    return (
        <ActiveSessionClient
            paper={sanitizedPaper}
            mode={SessionMode.MOCK}
            sessionId={sessionId}
            userId={session.userId}
        />
    );
}