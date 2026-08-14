import Link from "next/link";
import { ArrowLeft, ExternalLink, FileQuestion, Gauge, Timer, Users } from "lucide-react";
import { getQuestionQualityQueue } from "@/lib/moderation/admin-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";

const SAMPLE_LABELS = {
    INSUFFICIENT: "Fewer than 30 graded attempts",
    EARLY: "Early signal: 30–99 graded attempts",
    RELIABLE: "100+ graded attempts",
} as const;

function formatSeconds(value: number | null) {
    if (value === null) return "—";
    if (value < 60) return `${value}s`;
    return `${Math.floor(value / 60)}m ${value % 60}s`;
}

export default async function QuestionQualityPage() {
    const questions = await getQuestionQualityQueue();
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link
                href="/admin/content-health"
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft size={16} />
                Content health
            </Link>
            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                        Question quality
                    </p>
                    <h1 className="mt-2 text-3xl font-black">Reported-question review queue</h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        This is evidence for human review, not an automated verdict. Accuracy, skips, and time use durable aggregate counters from completed standard sessions; sample labels prevent weak data from being over-interpreted.
                    </p>
                </div>
                <Link
                    href="/admin/moderation?target=QUESTION"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                    All question cases
                </Link>
            </div>

            {questions.length === 0 ? (
                <section className="mt-7 rounded-2xl border border-border bg-card p-12 text-center">
                    <FileQuestion className="mx-auto text-muted-foreground" size={32} />
                    <h2 className="mt-4 font-black">No reported questions need review</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Open question reports will appear here with their attempt evidence.
                    </p>
                </section>
            ) : (
                <section className="mt-7 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {questions.map((question) => (
                        <article key={question.questionId} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    {question.isEscalated && (
                                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive">
                                            Needs attention
                                        </span>
                                    )}
                                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        {SAMPLE_LABELS[question.sampleBand]}
                                    </span>
                                </div>
                                <h2 className="mt-3 line-clamp-2 font-black leading-snug">{question.content}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {question.paper?.title ?? "Paper unavailable"} · {question.openCaseCount} open {question.openCaseCount === 1 ? "case" : "cases"}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {question.topCategories.map(({ category, count }) => (
                                        <span key={category} className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                            {REPORT_CATEGORY_LABELS[category]} · {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3 lg:w-[500px]">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <Metric icon={Users} label="Reporters" value={String(question.uniqueReporterCount)} />
                                    <Metric icon={Gauge} label="Accuracy" value={question.accuracy === null ? "—" : `${question.accuracy}%`} />
                                    <Metric icon={Gauge} label="Skipped" value={question.skipRate === null ? "—" : `${question.skipRate}%`} />
                                    <Metric icon={Timer} label="Avg. time" value={formatSeconds(question.averageDwellSeconds)} />
                                </div>
                                <div className="flex justify-end gap-2">
                                    {question.paper && (
                                        <Link
                                            href={`/library/paper/${question.paper.id}/edit?moderationCaseId=${question.caseId}&reportedQuestionId=${question.questionId}`}
                                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
                                        >
                                            Edit question <ExternalLink size={14} />
                                        </Link>
                                    )}
                                    <Link
                                        href={`/admin/moderation/${question.caseId}`}
                                        className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs font-black hover:border-primary/40 hover:text-primary"
                                    >
                                        Review reports
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Users;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-muted/60 p-3">
            <Icon size={14} className="text-muted-foreground" />
            <p className="mt-2 text-base font-black">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
    );
}
