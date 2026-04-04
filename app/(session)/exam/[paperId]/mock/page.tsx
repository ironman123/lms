// mock/page.tsx
import prisma from "@/lib/prisma";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { SessionMode } from "@prisma/client";

export default async function MockSessionPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { paperId } = await params;
    const { sessionId } = await searchParams;

    if (!sessionId) redirect(`/exam/${paperId}/lobby`);

    const [session, paper] = await Promise.all([
        prisma.testSession.findUnique({ where: { id: sessionId } }),
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