// app/(session)/exam/[paperId]/practice/page.tsx
import { redirect } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import { SessionMode } from "@prisma/client";
import { loadActiveSession } from "@/lib/session-loader";

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

    const data = await loadActiveSession(
        sessionId,
        paperId,
        SessionMode.PRACTICE
    );

    if (!data) {
        redirect(`/exam/${paperId}/lobby?sessionUnavailable=1`);
    }

    return (
        <ActiveSessionClient
            paper={data.paper}
            mode={SessionMode.PRACTICE}
            sessionId={sessionId}
            userId={data.session.userId}
            sessionStartedAt={data.session.startTime.toISOString()}
            restoredInteractions={data.restoredInteractions}
        />
    );
}
