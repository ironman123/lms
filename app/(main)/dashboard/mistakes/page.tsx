import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { APP_TIME_ZONE } from "@/lib/date-utils";

const PAGE_SIZE = 20;

export default async function MistakeNotebookPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const user = await requireAuth();
    const params = await searchParams;
    const status = params.status === "repaired" ? "REPAIRED" : "ACTIVE";
    const requestedPage = Number.parseInt(params.page ?? "1", 10);
    const page = Number.isFinite(requestedPage)
        ? Math.max(1, requestedPage)
        : 1;
    const where = { userId: user.id, status } as const;

    const [activeCount, repairedCount, total, entries] = await Promise.all([
        prisma.mistakeNotebookEntry.count({
            where: { userId: user.id, status: "ACTIVE" },
        }),
        prisma.mistakeNotebookEntry.count({
            where: { userId: user.id, status: "REPAIRED" },
        }),
        prisma.mistakeNotebookEntry.count({ where }),
        prisma.mistakeNotebookEntry.findMany({
            where,
            select: {
                id: true,
                status: true,
                wrongCount: true,
                correctAfterMistakeCount: true,
                lastWrongAt: true,
                lastReviewedAt: true,
                lastSessionId: true,
                question: {
                    select: {
                        content: true,
                        difficulty: true,
                        topicPath: true,
                        isArchived: true,
                        isCancelled: true,
                        paper: { select: { title: true } },
                    },
                },
            },
            orderBy:
                status === "ACTIVE"
                    ? [{ nextReviewAt: "asc" }, { lastWrongAt: "desc" }]
                    : { repairedAt: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const baseStatus = status === "REPAIRED" ? "repaired" : "active";

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft size={16} /> Back to dashboard
                </Link>

                <header className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">
                        Personal revision queue
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                        Mistake Notebook
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Every objectively wrong answer is saved here automatically. Answer it correctly in two later completed sessions to mark it repaired; another wrong answer reopens it.
                    </p>
                </header>

                <nav className="mt-8 grid grid-cols-2 gap-3" aria-label="Mistake notebook filters">
                    <Link
                        href="/dashboard/mistakes?status=active"
                        aria-current={status === "ACTIVE" ? "page" : undefined}
                        className={`rounded-2xl border p-4 transition-colors ${status === "ACTIVE" ? "border-rose-500/40 bg-rose-500/10" : "border-border bg-card hover:bg-accent"}`}
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active</p>
                        <p className="mt-1 text-2xl font-black text-foreground">{activeCount}</p>
                    </Link>
                    <Link
                        href="/dashboard/mistakes?status=repaired"
                        aria-current={status === "REPAIRED" ? "page" : undefined}
                        className={`rounded-2xl border p-4 transition-colors ${status === "REPAIRED" ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-card hover:bg-accent"}`}
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Repaired</p>
                        <p className="mt-1 text-2xl font-black text-foreground">{repairedCount}</p>
                    </Link>
                </nav>

                <section className="mt-8 space-y-4">
                    {entries.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                            <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
                            <h2 className="mt-4 text-lg font-black text-foreground">
                                {status === "ACTIVE" ? "Nothing to repair" : "No repaired questions yet"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {status === "ACTIVE"
                                    ? "Your next wrong objective answer will appear here automatically."
                                    : "Questions move here after two later correct attempts."}
                            </p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <article key={entry.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                                    <span className={entry.status === "ACTIVE" ? "rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-600 dark:text-rose-300" : "rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"}>
                                        {entry.status === "ACTIVE" ? "Needs repair" : "Repaired"}
                                    </span>
                                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{entry.question.difficulty}</span>
                                    {(entry.question.isArchived || entry.question.isCancelled) && (
                                        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">Unavailable for new sessions</span>
                                    )}
                                </div>

                                <h2 className="mt-4 text-base font-bold leading-relaxed text-foreground sm:text-lg">
                                    {entry.question.content}
                                </h2>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {entry.question.paper?.title ?? "Question paper"}
                                    {entry.question.topicPath ? ` · ${entry.question.topicPath}` : ""}
                                </p>

                                <div className="mt-5 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-3">
                                    <div>
                                        <p className="font-bold text-muted-foreground">Wrong attempts</p>
                                        <p className="mt-1 font-black text-foreground">{entry.wrongCount}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-muted-foreground">Repair progress</p>
                                        <p className="mt-1 font-black text-foreground">{Math.min(entry.correctAfterMistakeCount, 2)} / 2 correct</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-muted-foreground">Last reviewed</p>
                                        <p className="mt-1 font-black text-foreground">
                                            {entry.lastReviewedAt.toLocaleDateString("en-IN", {
                                                timeZone: APP_TIME_ZONE,
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {entry.lastSessionId && (
                                    <Link
                                        href={`/results/${entry.lastSessionId}`}
                                        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
                                    >
                                        <RotateCcw size={15} /> Review last attempt
                                    </Link>
                                )}
                            </article>
                        ))
                    )}
                </section>

                {totalPages > 1 && (
                    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Mistake notebook pages">
                        {page > 1 ? (
                            <Link href={`/dashboard/mistakes?status=${baseStatus}&page=${page - 1}`} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-accent">
                                Previous
                            </Link>
                        ) : <span />}
                        <span className="text-sm font-bold text-muted-foreground">{page} / {totalPages}</span>
                        {page < totalPages ? (
                            <Link href={`/dashboard/mistakes?status=${baseStatus}&page=${page + 1}`} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-accent">
                                Next <ArrowRight size={15} />
                            </Link>
                        ) : <span />}
                    </nav>
                )}
            </main>
        </div>
    );
}
