import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock3,
    MinusCircle,
    RotateCcw,
    Target,
    XCircle,
} from "lucide-react";
import ResultReview from "@/components/ResultReview";
import { loadCompletedResult } from "@/lib/result-loader";
import { formatResultDuration } from "@/lib/exam-results";

function number(value: number) {
    return value.toFixed(2).replace(/\.?0+$/, "");
}

export default async function ResultsPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { paperId: routeId } = await params;
    const { sessionId: legacySessionId } = await searchParams;
    const sessionId = legacySessionId ?? routeId;

    if (legacySessionId && routeId !== legacySessionId) {
        redirect(`/results/${legacySessionId}`);
    }

    const result = await loadCompletedResult(sessionId);
    if (!result) notFound();

    const { summary } = result;
    const safePercent = Math.max(0, Math.min(100, summary.scorePercent));
    const completedLabel = new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(result.completedAt));

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
                <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                                {result.mode} result
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {completedLabel}
                            </span>
                        </div>
                        <h1 className="mt-3 text-2xl font-black leading-tight text-foreground sm:text-4xl">
                            {result.paperTitle}
                        </h1>
                        {result.exam && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {result.exam.name}
                            </p>
                        )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Link
                            href="/library/paper"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-accent"
                        >
                            <ArrowLeft size={16} />
                            Papers
                        </Link>
                        <Link
                            href={`/exam/${result.paperId}/lobby`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <RotateCcw size={16} />
                            Retake
                        </Link>
                    </div>
                </header>

                {!result.reviewComplete && (
                    <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
                        <p className="font-black">
                            Some legacy answer details could not be recovered
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            Your overall score and counters are preserved, but{" "}
                            {result.legacyUnavailableCount} question
                            {result.legacyUnavailableCount === 1 ? "" : "s"} from this
                            older attempt never reached the review store.
                        </p>
                    </div>
                )}

                {result.missingAnswerKeyCount > 0 && (
                    <div className="mb-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                        <p className="font-black">
                            Some questions were excluded from scoring
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            {result.missingAnswerKeyCount} question
                            {result.missingAnswerKeyCount === 1 ? "" : "s"} had
                            no valid answer key. They received no marks or
                            penalty and do not reduce the available score.
                        </p>
                    </div>
                )}

                <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                    <div className="relative grid gap-8 lg:grid-cols-[260px_1fr] lg:items-center">
                        <div className="flex flex-col items-center text-center">
                            <div
                                className="grid h-48 w-48 place-items-center rounded-full p-3"
                                style={{
                                    background: `conic-gradient(var(--primary) ${safePercent * 3.6}deg, var(--muted) 0deg)`,
                                }}
                            >
                                <div className="grid h-full w-full place-items-center rounded-full bg-card">
                                    <div>
                                        <p className="text-5xl font-black tracking-tight text-foreground">
                                            {number(summary.scorePercent)}
                                            <span className="text-xl text-muted-foreground">
                                                %
                                            </span>
                                        </p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            Score
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-lg font-black text-foreground">
                                {number(summary.earnedMarks)}{" "}
                                <span className="font-medium text-muted-foreground">
                                    / {number(summary.maximumMarks)} marks
                                </span>
                            </p>
                            {summary.penaltyMarks > 0 && (
                                <p className="mt-1 text-xs font-bold text-destructive">
                                    −{number(summary.penaltyMarks)} from negative
                                    marking
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-2xl border border-success/25 bg-success/10 p-4">
                                    <CheckCircle2
                                        size={18}
                                        className="text-success"
                                    />
                                    <p className="mt-3 text-2xl font-black text-foreground">
                                        {summary.correctCount}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Correct
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4">
                                    <XCircle
                                        size={18}
                                        className="text-destructive"
                                    />
                                    <p className="mt-3 text-2xl font-black text-foreground">
                                        {summary.incorrectCount}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Incorrect
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border bg-background p-4">
                                    <MinusCircle
                                        size={18}
                                        className="text-muted-foreground"
                                    />
                                    <p className="mt-3 text-2xl font-black text-foreground">
                                        {summary.skippedCount}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Skipped
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
                                    <Clock3
                                        size={18}
                                        className="text-warning"
                                    />
                                    <p className="mt-3 text-2xl font-black text-foreground">
                                        {summary.pendingReviewCount}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Pending
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
                                    <Target size={18} className="text-primary" />
                                    <div>
                                        <p className="font-black text-foreground">
                                            {number(summary.accuracy)}%
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            Accuracy on graded attempts
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
                                    <BarChart3
                                        size={18}
                                        className="text-primary"
                                    />
                                    <div>
                                        <p className="font-black text-foreground">
                                            {summary.attemptedCount}/
                                            {summary.totalQuestions}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            Attempted
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
                                    <Clock3 size={18} className="text-primary" />
                                    <div>
                                        <p className="font-black text-foreground">
                                            {formatResultDuration(
                                                summary.timeTakenSecs
                                            )}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            Active time
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                                Score uses total available marks. Accuracy measures
                                correct answers only among objectively graded
                                attempts, so these percentages can differ.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="mt-10">
                    <ResultReview
                        items={result.review}
                        sessionId={result.sessionId}
                    />
                </div>

                <footer className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                    <Link
                        href="/library/paper"
                        className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-bold text-foreground transition-colors hover:bg-accent sm:w-auto sm:flex-1"
                    >
                        Back to papers
                    </Link>
                    {result.exam && (
                        <Link
                            href={`/library/exam/${result.exam.slug}`}
                            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-border bg-card px-5 text-center text-sm font-bold text-foreground transition-colors hover:bg-accent sm:w-auto sm:flex-1"
                        >
                            View {result.exam.name}
                        </Link>
                    )}
                    <Link
                        href={`/exam/${result.paperId}/lobby`}
                        className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-primary px-5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:flex-1"
                    >
                        Try this paper again
                    </Link>
                </footer>
            </div>
        </main>
    );
}
