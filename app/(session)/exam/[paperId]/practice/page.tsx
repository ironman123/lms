// practice/page.tsx
import prisma from "@/lib/prisma";
import ActiveSessionClient from "@/components/ActiveSessionClient";


export default async function PracticeSessionPage({
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
            },
        }),
    ]);

    if (!session || session.paperId !== paperId || !paper) notFound();

    return (
        <ActiveSessionClient
            paper={paper}
            mode="practice"
            sessionId={sessionId}
            userId={session.userId}
        />
    );
}