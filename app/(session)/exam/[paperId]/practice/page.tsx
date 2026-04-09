//practice/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { SessionMode } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function PracticeSessionPage({
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
                examQuestionPaperLinks: {
                    include: { exam: { select: { name: true, duration: true } } },
                    take: 1,
                },
                questions: {
                    orderBy: { createdAt: "asc" },
                    include: { options: true },
                },
            },
        }),
    ]);

    if (!session || session.paperId !== paperId || !paper) notFound();

    return (
        <ActiveSessionClient
            paper={paper}
            mode={SessionMode.PRACTICE}
            sessionId={sessionId}     // no session for practice
            userId={session.userId}
        />
    );
}