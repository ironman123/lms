// app/(session)/exam/[paperId]/practice/page.tsx
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { SessionMode } from "@prisma/client";
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
        prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id },
        }),
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                examQuestionPaperLinks: {
                    include: { exam: { select: { name: true, duration: true } } },
                    take: 1,
                },
                // `options` is a Json field on Question — it is always fetched with the
                // row, so `include: { options: true }` is invalid and was removed.
                questions: {
                    orderBy: { createdAt: "asc" },
                },
            },
        }),
    ]);

    if (!session || session.paperId !== paperId || !paper) notFound();

    return (
        <ActiveSessionClient
            paper={paper}
            mode={SessionMode.PRACTICE}
            sessionId={sessionId}
            userId={session.userId}
        />
    );
}