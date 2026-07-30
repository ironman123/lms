import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    Clock3,
    Filter,
    MessageSquareWarning,
    SearchCheck,
} from "lucide-react";
import {
    ModerationCaseStatus,
    ModerationTargetType,
} from "@prisma/client";
import {
    getModerationQueue,
    type ModerationQueueFilters,
} from "@/lib/moderation/admin-service";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";
import { cn } from "@/lib/utils";

function parseEnum<T extends string>(
    value: string | undefined,
    values: readonly T[]
): T | undefined {
    return value && values.includes(value as T) ? (value as T) : undefined;
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    }).format(value);
}

function queueHref(
    current: Record<string, string | undefined>,
    change: Record<string, string | undefined>
) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...current, ...change })) {
        if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/admin/moderation?${query}` : "/admin/moderation";
}

export default async function ModerationPage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string;
        target?: string;
        attention?: string;
        page?: string;
    }>;
}) {
    const params = await searchParams;
    const filters: ModerationQueueFilters = {
        status: parseEnum(params.status, Object.values(ModerationCaseStatus)),
        targetType: parseEnum(
            params.target,
            Object.values(ModerationTargetType)
        ),
        attention:
            params.attention === "ESCALATED" ||
            params.attention === "BELOW_THRESHOLD"
                ? params.attention
                : undefined,
        page: Math.max(1, Number(params.page) || 1),
    };
    const queue = await getModerationQueue(filters);
    const current = {
        status: filters.status,
        target: filters.targetType,
        attention: filters.attention,
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                        Moderation queue
                    </p>
                    <h2 className="mt-2 text-3xl font-black">
                        Reported content
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Every report remains visible. Cases that cross the
                        unique-student threshold are promoted to needs
                        attention.
                    </p>
                </div>
                <Link
                    href="/admin/settings/moderation"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                    Configure thresholds
                </Link>
            </div>

            <section className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "Needs attention",
                        value: queue.counts.needsAttention,
                        icon: AlertTriangle,
                        href: queueHref(current, {
                            attention: "ESCALATED",
                            status: undefined,
                        }),
                        tone: "text-destructive bg-destructive/10",
                    },
                    {
                        label: "Below threshold",
                        value: queue.counts.belowThreshold,
                        icon: Clock3,
                        href: queueHref(current, {
                            attention: "BELOW_THRESHOLD",
                            status: "OPEN",
                        }),
                        tone: "text-warning bg-warning/10",
                    },
                    {
                        label: "In review",
                        value: queue.counts.inReview,
                        icon: SearchCheck,
                        href: queueHref(current, {
                            attention: undefined,
                            status: "IN_REVIEW",
                        }),
                        tone: "text-primary bg-primary/10",
                    },
                ].map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30"
                    >
                        <div
                            className={cn(
                                "grid h-10 w-10 place-items-center rounded-xl",
                                card.tone
                            )}
                        >
                            <card.icon size={18} />
                        </div>
                        <p className="mt-4 text-3xl font-black">{card.value}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {card.label}
                        </p>
                    </Link>
                ))}
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-sm font-black">
                        <Filter size={16} />
                        Filters
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            ["All", undefined],
                            ["Open", "OPEN"],
                            ["In review", "IN_REVIEW"],
                            ["Resolved", "RESOLVED"],
                            ["Dismissed", "DISMISSED"],
                        ].map(([label, value]) => (
                            <Link
                                key={label}
                                href={queueHref(current, {
                                    status: value,
                                    page: undefined,
                                })}
                                className={cn(
                                    "rounded-lg border px-3 py-2 text-xs font-bold",
                                    filters.status === value ||
                                        (!filters.status && !value)
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {label}
                            </Link>
                        ))}
                        {["QUESTION", "PAPER"].map((value) => (
                            <Link
                                key={value}
                                href={queueHref(current, {
                                    target:
                                        filters.targetType === value
                                            ? undefined
                                            : value,
                                    page: undefined,
                                })}
                                className={cn(
                                    "rounded-lg border px-3 py-2 text-xs font-bold",
                                    filters.targetType === value
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {value === "QUESTION"
                                    ? "Questions"
                                    : "Papers"}
                            </Link>
                        ))}
                    </div>
                </div>

                {queue.cases.length === 0 ? (
                    <div className="grid min-h-72 place-items-center p-8 text-center">
                        <div>
                            <MessageSquareWarning
                                className="mx-auto text-muted-foreground"
                                size={34}
                            />
                            <h3 className="mt-4 font-black">
                                No matching cases
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Try clearing the current filters.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {queue.cases.map((moderationCase) => {
                            const title =
                                moderationCase.question?.content ??
                                moderationCase.paper?.title ??
                                "Unavailable content";
                            const paperTitle =
                                moderationCase.question?.paper?.title;
                            return (
                                <Link
                                    key={moderationCase.id}
                                    href={`/admin/moderation/${moderationCase.id}`}
                                    className="grid gap-4 p-5 transition hover:bg-muted/35 lg:grid-cols-[1fr_auto] lg:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                                                    moderationCase.isEscalated
                                                        ? "bg-destructive/12 text-destructive"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {moderationCase.isEscalated
                                                    ? "Needs attention"
                                                    : "Below threshold"}
                                            </span>
                                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                {moderationCase.targetType}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground">
                                                {moderationCase.status.replace(
                                                    "_",
                                                    " "
                                                )}
                                            </span>
                                        </div>
                                        <h3 className="mt-3 line-clamp-2 font-black leading-snug">
                                            {title}
                                        </h3>
                                        {paperTitle && (
                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                {paperTitle}
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {moderationCase.reports.map(
                                                (report, index) => (
                                                    <span
                                                        key={`${report.category}-${index}`}
                                                        className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground"
                                                    >
                                                        {
                                                            REPORT_CATEGORY_LABELS[
                                                                report.category
                                                            ]
                                                        }
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-6 lg:justify-end">
                                        <div className="text-right">
                                            <p className="text-2xl font-black">
                                                {
                                                    moderationCase.uniqueReporterCount
                                                }
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                unique{" "}
                                                {moderationCase.uniqueReporterCount ===
                                                1
                                                    ? "reporter"
                                                    : "reporters"}
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                                {formatDate(
                                                    moderationCase.updatedAt
                                                )}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            size={18}
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {queue.totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-3">
                    {queue.page > 1 && (
                        <Link
                            href={queueHref(current, {
                                page: String(queue.page - 1),
                            })}
                            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
                        >
                            Previous
                        </Link>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {queue.page} / {queue.totalPages}
                    </span>
                    {queue.page < queue.totalPages && (
                        <Link
                            href={queueHref(current, {
                                page: String(queue.page + 1),
                            })}
                            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
                        >
                            Next
                        </Link>
                    )}
                </nav>
            )}
        </main>
    );
}
