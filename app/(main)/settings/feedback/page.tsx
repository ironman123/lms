import Link from "next/link";
import { AppFeedbackStatus } from "@prisma/client";
import { CheckCircle2, Clock3, MessageSquareText } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    APP_FEEDBACK_CATEGORY_LABELS,
    APP_FEEDBACK_STATUS_DESCRIPTIONS,
    APP_FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback/schemas";
import { cn } from "@/lib/utils";

const STATUS_TONES: Record<AppFeedbackStatus, string> = {
    NEW: "border-border bg-muted text-muted-foreground",
    ACKNOWLEDGED: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    IN_REVIEW: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    PLANNED: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    RESOLVED: "border-success/25 bg-success/10 text-success",
    CLOSED: "border-border bg-muted text-muted-foreground",
};

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(value);
}

export default async function MyFeedbackPage() {
    const user = await requireAuth();
    const feedback = await prisma.appFeedback.findMany({
        where: { reporterId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return (
        <main className="mx-auto max-w-4xl px-4 py-10 pb-32 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                        Feedback & support
                    </p>
                    <h1 className="mt-2 text-3xl font-black">My feedback</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Track everything you sent and see when the team responds.
                    </p>
                </div>
                <Link
                    href="/feedback"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
                >
                    Send feedback
                </Link>
            </div>

            <div className="mt-7 space-y-4">
                {feedback.length === 0 ? (
                    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                        <div>
                            <MessageSquareText
                                className="mx-auto text-muted-foreground"
                                size={32}
                            />
                            <h2 className="mt-4 font-black">No feedback yet</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                App feedback you submit will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    feedback.map((item) => (
                        <article
                            id={`feedback-${item.id}`}
                            key={item.id}
                            className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        {APP_FEEDBACK_CATEGORY_LABELS[item.category]}
                                    </p>
                                    <h2 className="mt-2 text-lg font-black text-foreground">
                                        {item.title}
                                    </h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Sent {formatDate(item.createdAt)}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                                        STATUS_TONES[item.status]
                                    )}
                                >
                                    {APP_FEEDBACK_STATUS_LABELS[item.status]}
                                </span>
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
                                {item.message}
                            </p>

                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                                {item.acknowledgedAt ? (
                                    <CheckCircle2
                                        className="mt-0.5 shrink-0 text-success"
                                        size={17}
                                    />
                                ) : (
                                    <Clock3
                                        className="mt-0.5 shrink-0 text-muted-foreground"
                                        size={17}
                                    />
                                )}
                                <div>
                                    <p className="text-xs font-black text-foreground">
                                        {APP_FEEDBACK_STATUS_LABELS[item.status]}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                        {APP_FEEDBACK_STATUS_DESCRIPTIONS[item.status]}
                                        {item.acknowledgedAt
                                            ? ` Acknowledged ${formatDate(item.acknowledgedAt)}.`
                                            : ""}
                                    </p>
                                </div>
                            </div>

                            {item.adminResponse && (
                                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/8 p-4 text-sm leading-relaxed text-foreground">
                                    <strong>Team response:</strong>{" "}
                                    {item.adminResponse}
                                </div>
                            )}
                        </article>
                    ))
                )}
            </div>
        </main>
    );
}
