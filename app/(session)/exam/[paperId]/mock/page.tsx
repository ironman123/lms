// app/(session)/exam/[paperId]/mock/page.tsx
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { redirect } from "next/navigation";
import { SessionMode } from "@prisma/client";
import { loadActiveSession } from "@/lib/session-loader";

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

    const data = await loadActiveSession(
        sessionId,
        paperId,
        SessionMode.MOCK
    );

    if (!data) {
        redirect(`/exam/${paperId}/lobby?sessionUnavailable=1`);
    }

    // Strip every answer-revealing field before sending to the client.
    // `options` (Json) intentionally keeps its display text but we null out
    // the index-based answer fields so the client cannot derive the answer.
    const sanitizedPaper = {
        ...data.paper,
        questions: data.paper.questions.map((q) => ({
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
            userId={data.session.userId}
            sessionExpiresAt={data.session.expiresAt?.toISOString() ?? null}
            restoredInteractions={data.restoredInteractions}
        />
    );
}
