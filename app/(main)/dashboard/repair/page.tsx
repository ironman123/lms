import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import StartRepairButton from "@/components/StartRepairButton";

export default async function TodayRepairPage() {
    const user = await requireAuth();
    const now = new Date();
    const [dueEntries, nextEntry] = await Promise.all([
        prisma.mistakeNotebookEntry.findMany({
            where: {
                userId: user.id,
                status: "ACTIVE",
                nextReviewAt: { lte: now },
                question: {
                    isArchived: false,
                    isCancelled: false,
                    paper: {
                        is: { isArchived: false, status: "PUBLISHED" },
                    },
                },
            },
            select: {
                questionId: true,
                wrongCount: true,
                question: {
                    select: {
                        paperId: true,
                        topicPath: true,
                        paper: { select: { title: true } },
                    },
                },
            },
            orderBy: [{ nextReviewAt: "asc" }, { wrongCount: "desc" }],
            take: 200,
        }),
        prisma.mistakeNotebookEntry.findFirst({
            where: {
                userId: user.id,
                status: "ACTIVE",
                nextReviewAt: { gt: now },
            },
            select: { nextReviewAt: true },
            orderBy: { nextReviewAt: "asc" },
        }),
    ]);

    const groups = new Map<string, {
        paperId: string;
        title: string;
        count: number;
        wrongWeight: number;
        topics: Set<string>;
    }>();
    for (const entry of dueEntries) {
        const paperId = entry.question.paperId;
        if (!paperId || !entry.question.paper) continue;
        const group = groups.get(paperId) ?? {
            paperId,
            title: entry.question.paper.title,
            count: 0,
            wrongWeight: 0,
            topics: new Set<string>(),
        };
        group.count++;
        group.wrongWeight += entry.wrongCount;
        if (entry.question.topicPath) group.topics.add(entry.question.topicPath);
        groups.set(paperId, group);
    }
    const repairGroups = [...groups.values()].sort(
        (left, right) =>
            right.wrongWeight - left.wrongWeight || right.count - left.count
    );

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={16} /> Back to dashboard
                </Link>
                <header className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Spaced repair queue</p>
                    <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">Today’s Repair</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Short sets of due mistakes, ordered by urgency. A wrong repair returns tomorrow; one correct answer returns in three days; two correct reviews mark it repaired.
                    </p>
                </header>

                <section className="mt-8 space-y-4">
                    {repairGroups.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                            <CheckCircle2 className="mx-auto text-emerald-500" size={38} />
                            <h2 className="mt-4 text-xl font-black text-foreground">You’re caught up</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {nextEntry?.nextReviewAt
                                    ? `Next repair is scheduled for ${nextEntry.nextReviewAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`
                                    : "New wrong answers will appear here automatically."}
                            </p>
                        </div>
                    ) : (
                        repairGroups.map((group) => (
                            <article key={group.paperId} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
                                            <CalendarClock size={16} />
                                            <span className="text-xs font-black uppercase tracking-widest">{group.count} due</span>
                                        </div>
                                        <h2 className="mt-2 text-lg font-black text-foreground">{group.title}</h2>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {[...group.topics].slice(0, 3).join(" · ") || "General revision"}
                                        </p>
                                    </div>
                                    <StartRepairButton
                                        paperId={group.paperId}
                                        label={`Repair ${Math.min(group.count, 10)}`}
                                    />
                                </div>
                            </article>
                        ))
                    )}
                </section>
            </main>
        </div>
    );
}
