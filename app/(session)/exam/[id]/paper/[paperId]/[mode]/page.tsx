// app/library/exam/[id]/paper/[paperId]/(session)/[mode]/page.tsx

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";

export default async function SessionPage({
    params,
    searchParams // 1. ADD THIS to catch query parameters
}: {
    params: Promise<{ id: string, paperId: string, mode: 'practice' | 'mock' }>;
    searchParams: Promise<{ sessionId?: string }>; // 2. Type definition
}) {
    const { id, paperId, mode } = await params;
    const { sessionId } = await searchParams; // 3. Extract the ID

    // Security Check: If they tried to bypass the start button or reload without an ID, kick them out.
    if (!sessionId)
    {
        redirect(`/library/exam/${id}`);
    }

    // Verify the session is valid and belongs to this paper
    const activeSession = await prisma.testSession.findUnique({
        where: { id: sessionId },
    });

    if (!activeSession || activeSession.paperId !== paperId)
    {
        notFound();
    }

    const paperData = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: {
            exam: true,
            questions: {
                orderBy: { createdAt: 'asc' },
                include: {
                    options: true,
                    topic: { select: { name: true } }
                }
            }
        }
    });

    if (!paperData) notFound();

    return (
        <ActiveSessionClient
            paper={paperData}
            mode={mode}
            sessionId={sessionId} // 4. PASS THIS DOWN
            userId={activeSession.userId} // 5. PASS THIS DOWN
        />
    );
}