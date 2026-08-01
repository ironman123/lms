import { redirect } from "next/navigation";
import { SessionMode } from "@prisma/client";
import ActiveSessionClient from "@/components/ActiveSessionClient";
import {
    isOwnedCompletedSession,
    loadActiveSession,
} from "@/lib/session-loader";

export default async function RepairSessionPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { paperId } = await params;
    const { sessionId } = await searchParams;
    if (!sessionId) redirect("/dashboard/repair");

    const data = await loadActiveSession(
        sessionId,
        paperId,
        SessionMode.DIAGNOSTIC
    );
    if (!data) {
        if (
            await isOwnedCompletedSession(
                sessionId,
                paperId,
                SessionMode.DIAGNOSTIC
            )
        ) {
            redirect(`/results/${sessionId}`);
        }
        redirect("/dashboard/repair");
    }

    return (
        <ActiveSessionClient
            paper={data.paper}
            mode={SessionMode.DIAGNOSTIC}
            sessionId={sessionId}
            userId={data.session.userId}
            sessionExpiresAt={data.session.expiresAt?.toISOString() ?? null}
            restoredInteractions={data.restoredInteractions}
            reportIdsByQuestion={data.reportIdsByQuestion}
        />
    );
}
