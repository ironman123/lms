import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, FileWarning } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    getExamContentHealth,
    getPaperContentHealth,
    getPaperContentPerformance,
} from "@/lib/moderation/admin-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";
import QuestionAnalyticsBackfillControls from "@/components/QuestionAnalyticsBackfillControls";

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(value);
}

export default async function ContentHealthPage() {
    const [papers, exams] = await Promise.all([
        getPaperContentHealth(),
        getExamContentHealth(),
    ]);
    const paperPerformance = await getPaperContentPerformance(
        papers.map((paper) => paper.paperId)
    );
    const totals = papers.reduce(
        (summary, paper) => ({
            openCases: summary.openCases + paper.openCaseCount,
            escalatedCases: summary.escalatedCases + paper.escalatedCaseCount,
            affectedQuestions:
                summary.affectedQuestions + paper.affectedQuestionCount,
        }),
        { openCases: 0, escalatedCases: 0, affectedQuestions: 0 }
    );

    const metricCards: Array<{
        label: string;
        value: number;
        icon: LucideIcon;
    }> = [
        { label: "Papers at risk", value: papers.length, icon: FileWarning },
        { label: "Open cases", value: totals.openCases, icon: BarChart3 },
        {
            label: "Escalated cases",
            value: totals.escalatedCases,
            icon: AlertTriangle,
        },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                        Content health
                    </p>
                    <h2 className="mt-2 text-3xl font-black">
                        Papers needing attention
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        Unresolved student reports, grouped by paper. Rates use
                        unique reporters per 100 completed standard sessions so
                        large papers are not judged by raw counts alone.
                    </p>
                </div>
                <Link
                    href="/admin/moderation"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                    Open moderation queue <ArrowRight size={16} />
                </Link>
            </div>

            <section className="mt-7 grid gap-3 sm:grid-cols-3">
                {metricCards.map(({ label, value, icon: Icon }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-border bg-card p-5"
                    >
                        <Icon className="text-primary" size={19} />
                        <p className="mt-4 text-3xl font-black">{value}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {label}
                        </p>
                    </div>
                ))}
            </section>

            <section className="mt-7 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-black">Historical analytics backfill</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Projects up to 100 completed sessions with retained interactions into durable daily counters. It is idempotent, so retrying never double-counts.
                    </p>
                </div>
                <QuestionAnalyticsBackfillControls />
            </section>

            <div className="mt-5 flex justify-end">
                <Link
                    href="/admin/content-health/questions"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                    Review reported questions <ArrowRight size={16} />
                </Link>
            </div>

            <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h3 className="font-black">Ranked paper queue</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Escalated cases rank first, then unique reporters and
                        active report volume. Resolved history is intentionally
                        excluded from this queue.
                    </p>
                </div>
                {papers.length === 0 ? (
                    <div className="p-12 text-center">
                        <BarChart3 className="mx-auto text-muted-foreground" size={32} />
                        <h3 className="mt-4 font-black">No unresolved content reports</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This queue will populate as students report papers or questions.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {papers.map((paper) => (
                            <div key={paper.paperId} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {paper.escalatedCaseCount > 0 && (
                                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive">
                                                Needs attention
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-muted-foreground">
                                            Last report {formatDate(paper.lastReportedAt)}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/admin/content-health/papers/${paper.paperId}`}
                                        className="mt-3 inline-block text-lg font-black hover:text-primary"
                                    >
                                        {paper.title}
                                    </Link>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {paper.exams.length
                                            ? paper.exams.map((exam) => exam.name).join(" · ")
                                            : "Standalone paper"}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {paper.topCategories.map(({ category, count }) => (
                                            <span key={category} className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                                {REPORT_CATEGORY_LABELS[category]} · {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[500px]">
                                    {[
                                        ["Unique reporters", paper.uniqueReporterCount],
                                        ["Open cases", paper.openCaseCount],
                                        ["Affected questions", paper.affectedQuestionCount],
                                        [
                                            "Reporters / 100 attempts",
                                            paper.reportersPerHundredAttempts === null
                                                ? "—"
                                                : paper.reportersPerHundredAttempts,
                                        ],
                                        [
                                            "Completion rate",
                                            paperPerformance.get(paper.paperId)
                                                ?.completionRate === null
                                                ? "—"
                                                : `${paperPerformance.get(paper.paperId)?.completionRate}%`,
                                        ],
                                        [
                                            "Average score",
                                            paperPerformance.get(paper.paperId)
                                                ?.averageScore === null
                                                ? "—"
                                                : `${paperPerformance.get(paper.paperId)?.averageScore}%`,
                                        ],
                                    ].map(([label, value]) => (
                                        <div key={String(label)} className="rounded-xl bg-muted/60 p-3">
                                            <p className="text-lg font-black">{String(value)}</p>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                                {String(label)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h3 className="font-black">Exam health roll-up</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Each exam uses its frozen session attribution for attempt counts. A linked paper contributes its unresolved content evidence to every exam it is intentionally linked to.
                    </p>
                </div>
                {exams.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground">
                        No reported papers are currently linked to an exam.
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {exams.map((exam) => (
                            <div key={exam.examId} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        {exam.escalatedCaseCount > 0 && (
                                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive">
                                                Needs attention
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {exam.paperCount} affected {exam.paperCount === 1 ? "paper" : "papers"}
                                        </span>
                                    </div>
                                    <h3 className="mt-2 text-lg font-black">{exam.name}</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-2 lg:w-[330px]">
                                    {[
                                        ["Open cases", exam.openCaseCount],
                                        ["Reporters", exam.uniqueReporterCount],
                                        [
                                            "Per 100 attempts",
                                            exam.reportersPerHundredAttempts === null
                                                ? "—"
                                                : exam.reportersPerHundredAttempts,
                                        ],
                                    ].map(([label, value]) => (
                                        <div key={String(label)} className="rounded-xl bg-muted/60 p-3">
                                            <p className="text-lg font-black">{String(value)}</p>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
