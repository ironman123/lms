"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { submitContentReport } from "@/app/(main)/actions/moderation-actions";
import {
    REPORT_CATEGORIES,
    REPORT_CATEGORY_LABELS,
    type ReportCategoryValue,
} from "@/lib/moderation/schemas";
import { cn } from "@/lib/utils";

type ReportTarget =
    | {
          targetType: "QUESTION";
          questionId: string;
          sessionId: string;
          source: "ACTIVE_SESSION" | "RESULT_REVIEW";
      }
    | {
          targetType: "PAPER";
          paperId: string;
          source: "PAPER_PAGE";
      };

const paperCategories = new Set<ReportCategoryValue>([
    "TYPO_OR_FORMATTING",
    "TRANSLATION_ISSUE",
    "OUT_OF_SYLLABUS",
    "DUPLICATE_QUESTION",
    "WRONG_PAPER_DETAILS",
    "INCOMPLETE_PAPER",
    "OTHER",
]);

export default function ReportIssueDialog({
    target,
    compact = false,
    className,
}: {
    target: ReportTarget;
    compact?: boolean;
    className?: string;
}) {
    const titleId = useId();
    const descriptionId = useId();
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [category, setCategory] = useState<ReportCategoryValue>(() =>
        target.targetType === "PAPER"
            ? "WRONG_PAPER_DETAILS"
            : "WRONG_ANSWER_KEY"
    );
    const [comment, setComment] = useState("");
    const [pending, startTransition] = useTransition();
    const categories =
        target.targetType === "PAPER"
            ? REPORT_CATEGORIES.filter((value) => paperCategories.has(value))
            : REPORT_CATEGORIES.filter(
                  (value) =>
                      value !== "WRONG_PAPER_DETAILS" &&
                      value !== "INCOMPLETE_PAPER"
              );

    useEffect(() => {
        if (!open) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !pending) setOpen(false);
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [open, pending]);

    const submit = () => {
        startTransition(async () => {
            const result = await submitContentReport({
                ...target,
                category,
                comment,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setSubmitted(true);
            setOpen(false);
            toast.success(
                result.uniqueReporterCount > 1
                    ? "Report saved. Other students have reported this too."
                    : "Report saved. Thank you for helping us improve."
            );
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors",
                    compact
                        ? "h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "h-10 border border-border bg-card px-3 text-foreground hover:border-destructive/35 hover:bg-destructive/5 hover:text-destructive",
                    submitted && "text-success hover:text-success",
                    className
                )}
                aria-label={
                    submitted ? "Update your issue report" : "Report an issue"
                }
            >
                {submitted ? (
                    <CheckCircle2 size={compact ? 14 : 16} />
                ) : (
                    <AlertTriangle size={compact ? 14 : 16} />
                )}
                <span className={compact ? "hidden sm:inline" : undefined}>
                    {submitted ? "Reported" : "Report issue"}
                </span>
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[100] grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target && !pending) {
                            setOpen(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={descriptionId}
                        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id={titleId}
                                    className="text-lg font-black text-foreground"
                                >
                                    Report an issue
                                </h2>
                                <p
                                    id={descriptionId}
                                    className="mt-1 text-sm leading-relaxed text-muted-foreground"
                                >
                                    Tell us what looks wrong. Your answer and
                                    exam score will not be affected.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={pending}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Close report dialog"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <label className="mt-6 block">
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                What is wrong?
                            </span>
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(
                                        event.target
                                            .value as ReportCategoryValue
                                    )
                                }
                                disabled={pending}
                                className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            >
                                {categories.map((value) => (
                                    <option key={value} value={value}>
                                        {REPORT_CATEGORY_LABELS[value]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="mt-5 block">
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                More details{" "}
                                <span className="font-medium normal-case text-muted-foreground">
                                    (optional)
                                </span>
                            </span>
                            <textarea
                                value={comment}
                                onChange={(event) =>
                                    setComment(event.target.value)
                                }
                                disabled={pending}
                                maxLength={5_000}
                                rows={4}
                                placeholder="Explain what should be checked..."
                                className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                            />
                            <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                                {comment.length}/5,000
                            </span>
                        </label>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={pending}
                                className="h-11 rounded-xl border border-border px-4 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submit}
                                disabled={pending}
                                className="h-11 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                            >
                                {pending ? "Sending…" : "Send report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
