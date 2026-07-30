import { notFound, redirect } from "next/navigation";

export default async function LegacyResultsPage({
    searchParams,
}: {
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { sessionId } = await searchParams;
    if (!sessionId) notFound();
    redirect(`/results/${sessionId}`);
}
