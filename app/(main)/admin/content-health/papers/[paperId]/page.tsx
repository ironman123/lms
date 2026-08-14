import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileQuestion, Flag, Gauge, Timer } from "lucide-react";
import { getPaperContentHealthDetail } from "@/lib/moderation/admin-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";

function formatSeconds(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";
    if (value < 60) return `${value}s`;
    return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export default async function PaperContentHealthDetailPage({
    params,
}: {
    params: Promise<{ paperId: string }>;
}) {
    const { paperId } = await params;
    const detail = await getPaperContentHealthDetail(paperId);
    if (!detail) notFound();
    const { paper, health, performance, questions, cases } = detail;

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/admin/content-health" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
                <ArrowLeft size={16} /> Content health
            </Link>
            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Paper health</p>
                    <h1 className="mt-2 text-3xl font-black">{paper.title}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {paper.examQuestionPaperLinks.length
                            ? paper.examQuestionPaperLinks.map(({ exam }) => exam.name).join(" · ")
                            : "Standalone paper"}
                        {paper.isArchived ? " · Archived" : ` · ${paper.status}`}
                    </p>
                </div>
                <Link href={`/library/paper/${paper.id}/edit`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">
                    Edit paper <ExternalLink size={16} />
                </Link>
            </div>

            <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric icon={Flag} label="Unique reporters" value={String(health?.uniqueReporterCount ?? 0)} />
                <Metric icon={FileQuestion} label="Affected questions" value={String(health?.affectedQuestionCount ?? 0)} />
                <Metric icon={Gauge} label="Completion rate" value={performance?.completionRate === null || performance?.completionRate === undefined ? "—" : `${performance.completionRate}%`} />
                <Metric icon={Timer} label="Average score" value={performance?.averageScore === null || performance?.averageScore === undefined ? "—" : `${performance.averageScore}%`} />
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h2 className="font-black">Affected questions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Only unresolved reports appear here. Question metrics use retained detailed interactions and are descriptive evidence, not automatic content verdicts.</p>
                </div>
                {questions.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground">No unresolved question reports for this paper.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {questions.map((question) => (
                            <div key={question.questionId} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="min-w-0">
                                    <p className="line-clamp-2 font-black">{question.content}</p>
                                    <p className="mt-2 text-xs text-muted-foreground">{question.uniqueReporterCount} reporters · {question.objectiveAttemptCount} graded attempts · {question.sampleBand.toLowerCase()} sample</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {question.topCategories.map(({ category, count }) => (
                                            <span key={category} className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{REPORT_CATEGORY_LABELS[category]} · {count}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <span className="rounded-lg bg-muted px-3 py-2 text-xs font-bold">{question.accuracy === null ? "—" : `${question.accuracy}%`} accuracy</span>
                                    <span className="rounded-lg bg-muted px-3 py-2 text-xs font-bold">{formatSeconds(question.averageDwellSeconds)} avg. time</span>
                                    <Link href={`/admin/moderation/${question.caseId}`} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-black hover:border-primary/40 hover:text-primary">Review</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-5">
                    <h2 className="font-black">Report timeline</h2>
                    <p className="mt-1 text-sm text-muted-foreground">All active report evidence for this paper and its questions.</p>
                </div>
                {cases.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground">No active report evidence.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {cases.flatMap((moderationCase) => moderationCase.reports.map((report) => ({ moderationCase, report }))).map(({ moderationCase, report }) => (
                            <div key={report.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-black">{REPORT_CATEGORY_LABELS[report.category]}</p>
                                    {report.comment && <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">{report.comment}</p>}
                                    <p className="mt-2 text-xs text-muted-foreground">{moderationCase.targetType.toLowerCase()} case · {moderationCase.status.replace("_", " ")}</p>
                                </div>
                                <p className="shrink-0 text-xs text-muted-foreground">{formatDate(report.updatedAt)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Flag; label: string; value: string }) {
    return <div className="rounded-2xl border border-border bg-card p-5"><Icon size={18} className="text-primary" /><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div>;
}
