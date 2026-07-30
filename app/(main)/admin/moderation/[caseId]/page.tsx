import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    ExternalLink,
    FileQuestion,
    History,
    MessageSquareText,
    Users,
} from "lucide-react";
import ModerationCaseActions from "@/components/ModerationCaseActions";
import { getModerationCase } from "@/lib/moderation/admin-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";
import { cn } from "@/lib/utils";

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export default async function ModerationCasePage({
    params,
}: {
    params: Promise<{ caseId: string }>;
}) {
    const { caseId } = await params;
    const moderationCase = await getModerationCase(caseId);
    if (!moderationCase) notFound();

    const snapshot = asRecord(moderationCase.targetSnapshot);
    const reportedContent =
        typeof snapshot?.content === "string"
            ? snapshot.content
            : typeof snapshot?.title === "string"
              ? snapshot.title
              : "Reported content is unavailable";
    const options = Array.isArray(snapshot?.options)
        ? snapshot.options
              .map(asRecord)
              .filter((option): option is Record<string, unknown> =>
                  Boolean(option)
              )
        : [];
    const currentContent =
        moderationCase.question?.content ??
        moderationCase.paper?.title ??
        "Content no longer available";
    const paper =
        moderationCase.question?.paper ?? moderationCase.paper ?? null;
    const categoryCounts = new Map<string, number>();
    for (const report of moderationCase.reports) {
        categoryCounts.set(
            report.category,
            (categoryCounts.get(report.category) ?? 0) + 1
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link
                href="/admin/moderation"
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft size={16} />
                Moderation queue
            </Link>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                                    moderationCase.isEscalated
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {moderationCase.isEscalated
                                    ? "Needs attention"
                                    : "Below threshold"}
                            </span>
                            <span className="rounded-full border border-border px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                {moderationCase.status.replace("_", " ")}
                            </span>
                            <span className="rounded-full border border-border px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                {moderationCase.targetType}
                            </span>
                        </div>
                        <h1 className="mt-5 text-2xl font-black leading-snug sm:text-3xl">
                            {reportedContent}
                        </h1>
                        {paper && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                {paper.title}
                            </p>
                        )}

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <Metric
                                icon={Users}
                                label="Unique reporters"
                                value={String(
                                    moderationCase.uniqueReporterCount
                                )}
                            />
                            <Metric
                                icon={FileQuestion}
                                label="Reported revision"
                                value={
                                    moderationCase.questionRevision
                                        ? `v${moderationCase.questionRevision}`
                                        : moderationCase.paperRevision
                                          ? `v${moderationCase.paperRevision}`
                                          : "Paper"
                                }
                            />
                            <Metric
                                icon={History}
                                label="Last updated"
                                value={formatDate(moderationCase.updatedAt)}
                            />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="font-black">
                                    Reported snapshot vs current content
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    The left side is immutable evidence of what
                                    students saw.
                                </p>
                            </div>
                            {moderationCase.question?.paper?.id && (
                                <Link
                                    href={`/library/paper/${moderationCase.question.paper.id}/edit`}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"
                                >
                                    Edit paper
                                    <ExternalLink size={14} />
                                </Link>
                            )}
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                                <p className="text-[10px] font-black uppercase tracking-wider text-warning">
                                    Reported version
                                </p>
                                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground">
                                    {reportedContent}
                                </p>
                                {options.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {options.map((option, index) => (
                                            <div
                                                key={index}
                                                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                                            >
                                                {typeof option.text ===
                                                "string"
                                                    ? option.text
                                                    : `Option ${index + 1}`}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-border bg-background p-4">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Current version
                                </p>
                                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground">
                                    {currentContent}
                                </p>
                                {moderationCase.question && (
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        Current revision v
                                        {
                                            moderationCase.question
                                                .contentRevision
                                        }
                                        {moderationCase.question.isArchived
                                            ? " · Archived"
                                            : ""}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                        <h2 className="font-black">Student reports</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {[...categoryCounts.entries()].map(
                                ([category, count]) => (
                                    <span
                                        key={category}
                                        className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground"
                                    >
                                        {
                                            REPORT_CATEGORY_LABELS[
                                                category as keyof typeof REPORT_CATEGORY_LABELS
                                            ]
                                        }{" "}
                                        · {count}
                                    </span>
                                )
                            )}
                        </div>
                        <div className="mt-5 divide-y divide-border">
                            {moderationCase.reports.map((report) => (
                                <article
                                    key={report.id}
                                    className="py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-black">
                                                {report.reporter.name ??
                                                    report.reporter.email}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {report.reporter.email}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatDate(report.updatedAt)}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-bold text-primary">
                                        {
                                            REPORT_CATEGORY_LABELS[
                                                report.category
                                            ]
                                        }
                                    </p>
                                    {report.comment && (
                                        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/45 p-3 text-sm leading-relaxed text-foreground">
                                            {report.comment}
                                        </p>
                                    )}
                                    {report.session && (
                                        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                            {report.session.mode} ·{" "}
                                            {report.session.status}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <ModerationCaseActions
                        caseId={moderationCase.id}
                        status={moderationCase.status}
                    />

                    <section className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2">
                            <MessageSquareText size={16} />
                            <h2 className="text-sm font-black uppercase tracking-wider">
                                Audit timeline
                            </h2>
                        </div>
                        <div className="mt-4 space-y-4">
                            {moderationCase.actions.map((action) => (
                                <div
                                    key={action.id}
                                    className="border-l-2 border-border pl-3"
                                >
                                    <p className="text-xs font-black">
                                        {action.action.replaceAll("_", " ")}
                                    </p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        {action.actor?.name ??
                                            action.actor?.email ??
                                            "System"}{" "}
                                        · {formatDate(action.createdAt)}
                                    </p>
                                    {action.note && (
                                        <p className="mt-2 text-xs leading-relaxed text-foreground/75">
                                            {action.note}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
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
        <div className="rounded-xl border border-border bg-background p-4">
            <Icon size={16} className="text-primary" />
            <p className="mt-3 text-sm font-black">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
        </div>
    );
}
