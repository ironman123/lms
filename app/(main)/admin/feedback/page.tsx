import Link from "next/link";
import { AppFeedbackStatus } from "@prisma/client";
import { CheckCheck, Clock3, Inbox, SearchCheck } from "lucide-react";
import AdminFeedbackActions from "@/components/AdminFeedbackActions";
import {
    APP_FEEDBACK_CATEGORY_LABELS,
    APP_FEEDBACK_STATUSES,
    APP_FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback/schemas";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(value);
}

function feedbackHref(status?: string, page?: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (page && page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/feedback?${query}` : "/admin/feedback";
}

export default async function AdminFeedbackPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const params = await searchParams;
    const status = Object.values(AppFeedbackStatus).includes(
        params.status as AppFeedbackStatus
    )
        ? (params.status as AppFeedbackStatus)
        : undefined;
    const page = Math.max(1, Number(params.page) || 1);
    const where = status ? { status } : {};

    const [feedback, total, groupedCounts, assignees] = await Promise.all([
        prisma.appFeedback.findMany({
            where,
            include: {
                reporter: { select: { name: true, email: true } },
                acknowledgedBy: { select: { name: true, email: true } },
            },
            orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.appFeedback.count({ where }),
        prisma.appFeedback.groupBy({
            by: ["status"],
            _count: { _all: true },
        }),
        prisma.user.findMany({
            where: { role: { in: ["ADMIN", "CREATOR"] } },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const counts = Object.fromEntries(
        groupedCounts.map((item) => [item.status, item._count._all])
    ) as Partial<Record<AppFeedbackStatus, number>>;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const summary = [
        {
            label: "New",
            value: counts.NEW ?? 0,
            icon: Inbox,
            tone: "bg-primary/10 text-primary",
            href: feedbackHref("NEW"),
        },
        {
            label: "Acknowledged",
            value: counts.ACKNOWLEDGED ?? 0,
            icon: CheckCheck,
            tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
            href: feedbackHref("ACKNOWLEDGED"),
        },
        {
            label: "In review",
            value: counts.IN_REVIEW ?? 0,
            icon: SearchCheck,
            tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            href: feedbackHref("IN_REVIEW"),
        },
        {
            label: "Resolved",
            value: counts.RESOLVED ?? 0,
            icon: Clock3,
            tone: "bg-success/10 text-success",
            href: feedbackHref("RESOLVED"),
        },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Product operations
            </p>
            <h2 className="mt-2 text-3xl font-black">Feedback inbox</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Student feedback lands here. Acknowledge it when someone has
                seen it, assign an owner, then move it through review, planning,
                and resolution. Responses are visible in the student’s feedback
                history.
            </p>

            <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {summary.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30 sm:p-5"
                    >
                        <div
                            className={cn(
                                "grid h-9 w-9 place-items-center rounded-xl",
                                item.tone
                            )}
                        >
                            <item.icon size={17} />
                        </div>
                        <p className="mt-3 text-2xl font-black">{item.value}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-xs">
                            {item.label}
                        </p>
                    </Link>
                ))}
            </section>

            <nav
                aria-label="Feedback status filters"
                className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            >
                <Link
                    href="/admin/feedback"
                    className={cn(
                        "shrink-0 rounded-xl border px-3 py-2 text-xs font-bold",
                        !status
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground"
                    )}
                >
                    All
                </Link>
                {APP_FEEDBACK_STATUSES.map((value) => (
                    <Link
                        key={value}
                        href={feedbackHref(value)}
                        className={cn(
                            "shrink-0 rounded-xl border px-3 py-2 text-xs font-bold",
                            status === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground"
                        )}
                    >
                        {APP_FEEDBACK_STATUS_LABELS[value]} ({counts[value] ?? 0})
                    </Link>
                ))}
            </nav>

            <div className="mt-6 space-y-4">
                {feedback.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                        No feedback tickets match this filter.
                    </div>
                ) : (
                    feedback.map((item) => (
                        <article
                            key={item.id}
                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                        >
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                                                {APP_FEEDBACK_CATEGORY_LABELS[item.category]}
                                            </span>
                                            <span>{item.priority}</span>
                                            <span aria-hidden="true">•</span>
                                            <span>
                                                {APP_FEEDBACK_STATUS_LABELS[item.status]}
                                            </span>
                                        </div>
                                        <h3 className="mt-3 text-lg font-black">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <div className="shrink-0 text-left text-[11px] text-muted-foreground sm:text-right">
                                        <p className="font-bold text-foreground/75">
                                            {item.reporter.name ?? item.reporter.email}
                                        </p>
                                        <p className="mt-1">{formatDate(item.createdAt)}</p>
                                        <p className="mt-1 font-mono">#{item.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
                                    {item.message}
                                </p>
                                {item.pageUrl && (
                                    <a
                                        href={item.pageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 block break-all text-xs font-medium text-primary hover:underline"
                                    >
                                        Page: {item.pageUrl}
                                    </a>
                                )}
                                {item.acknowledgedAt && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Acknowledged {formatDate(item.acknowledgedAt)}
                                        {item.acknowledgedBy
                                            ? ` by ${item.acknowledgedBy.name ?? item.acknowledgedBy.email}`
                                            : ""}
                                    </p>
                                )}
                            </div>
                            <AdminFeedbackActions
                                feedback={{
                                    id: item.id,
                                    status: item.status,
                                    priority: item.priority,
                                    assignedToId: item.assignedToId,
                                    adminResponse: item.adminResponse,
                                }}
                                assignees={assignees}
                            />
                        </article>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-3">
                    {page > 1 && (
                        <Link
                            href={feedbackHref(status, page - 1)}
                            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
                        >
                            Previous
                        </Link>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {page} / {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={feedbackHref(status, page + 1)}
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
