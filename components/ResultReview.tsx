"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
    AlertCircle,
    Bookmark,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Eye,
    Minus,
    X,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    ResultReviewItem,
} from "@/lib/result-loader";
import type { ResultGrade } from "@/lib/exam-results";
import ReportIssueDialog from "@/components/ReportIssueDialog";
import { confidenceBand } from "@/lib/confidence-calibration";

type Filter = "ALL" | ResultGrade | "FLAGGED";

const gradeConfig: Record<
    ResultGrade,
    {
        label: string;
        icon: typeof CheckCircle2;
        className: string;
        iconClassName: string;
    }
> = {
    CORRECT: {
        label: "Correct",
        icon: CheckCircle2,
        className:
            "border-success/35 bg-success/5 text-card-foreground dark:border-success/45 dark:bg-success/10",
        iconClassName: "text-success",
    },
    INCORRECT: {
        label: "Incorrect",
        icon: XCircle,
        className:
            "border-destructive/35 bg-destructive/5 text-card-foreground dark:border-destructive/45 dark:bg-destructive/10",
        iconClassName: "text-destructive",
    },
    SKIPPED: {
        label: "Skipped",
        icon: Minus,
        className: "border-border bg-card text-card-foreground",
        iconClassName: "text-muted-foreground",
    },
    PENDING: {
        label: "Pending review",
        icon: Clock3,
        className:
            "border-warning/40 bg-warning/5 text-card-foreground dark:border-warning/50 dark:bg-warning/10",
        iconClassName: "text-warning",
    },
    UNAVAILABLE: {
        label: "Details unavailable",
        icon: AlertCircle,
        className:
            "border-border bg-muted/30 text-card-foreground dark:bg-muted/45",
        iconClassName: "text-muted-foreground",
    },
};

const filters: Array<{ value: Filter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "INCORRECT", label: "Incorrect" },
    { value: "SKIPPED", label: "Skipped" },
    { value: "CORRECT", label: "Correct" },
    { value: "PENDING", label: "Pending" },
    { value: "UNAVAILABLE", label: "Unavailable" },
    { value: "FLAGGED", label: "Flagged" },
];

function formatMarks(value: number) {
    if (value > 0) return `+${value.toFixed(2).replace(/\.?0+$/, "")}`;
    if (value < 0) return value.toFixed(2).replace(/\.?0+$/, "");
    return "0";
}

function ReviewCard({
    item,
    sessionId,
    existingReportId,
}: {
    item: ResultReviewItem;
    sessionId: string;
    existingReportId: string | null;
}) {
    const config = gradeConfig[item.grade];
    const Icon = config.icon;
    const gradeLabel =
        item.unavailableReason === "CANCELLED"
            ? "Officially cancelled"
            : config.label;
    const [explanationOpen, setExplanationOpen] = useState(
        item.grade === "INCORRECT"
    );
    const hasOptions =
        (item.question.type === "MCQ" || item.question.type === "MSQ") &&
        item.options.length > 0;

    return (
        <article
            id={`question-${item.position + 1}`}
            className={cn(
                "overflow-hidden rounded-2xl border shadow-sm",
                config.className
            )}
        >
            <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-black text-foreground">
                            Q{item.position + 1}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {item.question.type}
                        </span>
                        {item.question.topicPath && (
                            <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                · {item.question.topicPath}
                            </span>
                        )}
                        {item.isFlagged && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-warning">
                                <Bookmark size={11} fill="currentColor" />
                                Flagged
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <ReportIssueDialog
                            compact
                            target={{
                                targetType: "QUESTION",
                                questionId: item.questionId,
                                sessionId,
                                source: "RESULT_REVIEW",
                            }}
                            existingReportId={existingReportId}
                        />
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-black",
                                config.iconClassName
                            )}
                        >
                            <Icon size={16} aria-hidden="true" />
                            {gradeLabel}
                        </span>
                        <span
                            className={cn(
                                "min-w-12 text-right text-sm font-black",
                                item.marksAwarded > 0 && "text-success",
                                item.marksAwarded < 0 && "text-destructive",
                                item.marksAwarded === 0 &&
                                    "text-muted-foreground"
                            )}
                        >
                            {formatMarks(item.marksAwarded)}/
                            {item.question.marks}
                        </span>
                    </div>
                </div>

                <h3 className="mt-5 text-base font-bold leading-relaxed text-foreground sm:text-lg">
                    {item.question.content}
                </h3>

                {item.grade === "UNAVAILABLE" ? (
                    <div className="mt-5 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                        {item.unavailableReason === "CANCELLED" ? (
                            <>
                                <p className="font-bold text-foreground">
                                    Cancelled in the official answer key
                                </p>
                                <p className="mt-1">
                                    This question was preserved for reference but
                                    excluded from marks, penalties and accuracy.
                                </p>
                            </>
                        ) : item.unavailableReason === "MISSING_ANSWER_KEY" ? (
                            <>
                                <p className="font-bold text-foreground">
                                    This question has no valid answer key.
                                </p>
                                <p className="mt-1">
                                    It was excluded from the available marks and
                                    no penalty was applied. Recorded answer:{" "}
                                    <span className="font-semibold text-foreground">
                                        {item.selectedAnswerText}
                                    </span>
                                </p>
                            </>
                        ) : (
                            <>
                                This attempt predates reliable result snapshots.
                                The overall score is preserved, but this
                                question&apos;s submitted answer could not be
                                recovered.
                            </>
                        )}
                    </div>
                ) : hasOptions ? (
                    <div className="mt-5 grid gap-2">
                        {item.options.map((option) => {
                            const selectedWrong =
                                option.isSelected && !option.isCorrect;
                            return (
                                <div
                                    key={option.index}
                                    className={cn(
                                        "flex items-start gap-3 rounded-xl border bg-card p-3 text-sm",
                                        option.isCorrect &&
                                            "border-success/50 bg-success/10 dark:bg-success/15",
                                        selectedWrong &&
                                            "border-destructive/50 bg-destructive/10 dark:bg-destructive/15",
                                        !option.isCorrect &&
                                            !selectedWrong &&
                                            "border-border"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black",
                                            option.isCorrect &&
                                                "border-success/40 bg-success/15 text-success",
                                            selectedWrong &&
                                                "border-destructive/40 bg-destructive/15 text-destructive",
                                            !option.isCorrect &&
                                                !selectedWrong &&
                                                "border-border text-muted-foreground"
                                        )}
                                    >
                                        {option.isCorrect ? (
                                            <Check size={14} />
                                        ) : selectedWrong ? (
                                            <X size={14} />
                                        ) : (
                                            option.label
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium leading-relaxed text-foreground">
                                            {option.text}
                                        </p>
                                        {option.imageUrl && (
                                            <Image
                                                src={option.imageUrl}
                                                alt=""
                                                width={560}
                                                height={240}
                                                unoptimized
                                                className="mt-3 max-h-60 w-auto rounded-lg border border-border object-contain"
                                            />
                                        )}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] font-black uppercase tracking-wide">
                                        {option.isSelected && (
                                            <span className="text-primary">
                                                Your choice
                                            </span>
                                        )}
                                        {option.isCorrect && (
                                            <span className="text-success">
                                                Correct answer
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-background p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Your answer
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground">
                                {item.selectedAnswerText}
                            </p>
                        </div>
                        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-success">
                                Correct answer
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground">
                                {item.correctAnswerText}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-foreground/70">
                    {item.penaltyApplied > 0 && (
                        <span className="font-bold text-destructive">
                            −{item.penaltyApplied} negative mark
                        </span>
                    )}
                    {item.dwellTimeSeconds > 0 && (
                        <span>{item.dwellTimeSeconds}s spent</span>
                    )}
                    {item.wasHinted && <span>Hint viewed</span>}
                    {item.confidenceLevel !== null && (
                        <span
                            className={cn(
                                "rounded-full px-2 py-1 font-bold",
                                item.grade === "INCORRECT" && item.confidenceLevel >= 75
                                    ? "bg-destructive/10 text-destructive"
                                    : item.grade === "CORRECT" && item.confidenceLevel <= 50
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "bg-muted text-muted-foreground"
                            )}
                        >
                            {confidenceBand(item.confidenceLevel)} · {item.confidenceLevel}%
                            {item.grade === "INCORRECT" && item.confidenceLevel >= 75
                                ? " · confident mistake"
                                : item.grade === "CORRECT" && item.confidenceLevel <= 50
                                    ? " · hidden strength"
                                    : ""}
                        </span>
                    )}
                </div>
            </div>

            {item.question.explanation &&
                item.unavailableReason !== "LEGACY_RESULT_UNRECOVERABLE" && (
                <div className="border-t border-border bg-background/60">
                    <button
                        type="button"
                        onClick={() => setExplanationOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-foreground hover:bg-accent/40 sm:px-6"
                        aria-expanded={explanationOpen}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Eye size={14} className="text-primary" />
                            Explanation
                        </span>
                        <ChevronDown
                            size={15}
                            className={cn(
                                "transition-transform",
                                explanationOpen && "rotate-180"
                            )}
                        />
                    </button>
                    {explanationOpen && (
                        <p className="px-4 pb-5 text-sm leading-relaxed text-foreground/75 sm:px-6">
                            {item.question.explanation}
                        </p>
                    )}
                </div>
            )}
        </article>
    );
}

export default function ResultReview({
    items,
    sessionId,
    reportIdsByQuestion,
}: {
    items: ResultReviewItem[];
    sessionId: string;
    reportIdsByQuestion: Record<string, string>;
}) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const [visibleCount, setVisibleCount] = useState(20);

    const counts = useMemo(
        () => ({
            ALL: items.length,
            CORRECT: items.filter((item) => item.grade === "CORRECT").length,
            INCORRECT: items.filter((item) => item.grade === "INCORRECT").length,
            SKIPPED: items.filter((item) => item.grade === "SKIPPED").length,
            PENDING: items.filter((item) => item.grade === "PENDING").length,
            UNAVAILABLE: items.filter(
                (item) => item.grade === "UNAVAILABLE"
            ).length,
            FLAGGED: items.filter((item) => item.isFlagged).length,
        }),
        [items]
    );
    const filtered = useMemo(
        () =>
            filter === "ALL"
                ? items
                : filter === "FLAGGED"
                    ? items.filter((item) => item.isFlagged)
                    : items.filter((item) => item.grade === filter),
        [filter, items]
    );
    const visible = filtered.slice(0, visibleCount);

    return (
        <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                        Detailed review
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-foreground">
                        Understand every answer
                    </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    Showing {Math.min(visible.length, filtered.length)} of{" "}
                    {filtered.length}
                </p>
            </div>

            <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Filter reviewed questions"
            >
                {filters.map((option) => {
                    const count = counts[option.value as keyof typeof counts] ?? 0;
                    if (
                        option.value !== "ALL" &&
                        option.value !== "INCORRECT" &&
                        option.value !== "SKIPPED" &&
                        count === 0
                    ) {
                        return null;
                    }
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="tab"
                            aria-selected={filter === option.value}
                            onClick={() => {
                                setFilter(option.value);
                                setVisibleCount(20);
                            }}
                            className={cn(
                                "shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                                filter === option.value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground/75 hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {option.label} {count}
                        </button>
                    );
                })}
            </div>

            {visible.length > 0 ? (
                <div className="space-y-4">
                    {visible.map((item) => (
                <ReviewCard
                    key={item.id}
                    item={item}
                    sessionId={sessionId}
                    existingReportId={
                        reportIdsByQuestion[item.questionId] ?? null
                    }
                />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                    No questions match this filter.
                </div>
            )}

            {visibleCount < filtered.length && (
                <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 20)}
                    className="h-11 w-full rounded-xl border border-border bg-card text-sm font-bold text-foreground transition-colors hover:bg-accent"
                >
                    Load 20 more questions
                </button>
            )}
        </section>
    );
}
