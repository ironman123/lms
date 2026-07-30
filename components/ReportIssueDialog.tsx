"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
    submitContentReport,
    withdrawMyContentReport,
} from "@/app/(main)/actions/moderation-actions";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    existingReportId = null,
}: {
    target: ReportTarget;
    compact?: boolean;
    className?: string;
    existingReportId?: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [reportId, setReportId] = useState<string | null>(
        existingReportId
    );
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
            setReportId(result.reportId);
            setOpen(false);
            toast.success(
                result.uniqueReporterCount > 1
                    ? "Report saved. Other students have reported this too."
                    : "Report saved. Thank you for helping us improve."
            );
        });
    };

    const withdraw = () => {
        if (!reportId) return;
        startTransition(async () => {
            const result = await withdrawMyContentReport(reportId);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setReportId(null);
            setOpen(false);
            toast.success("Your report was withdrawn.");
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!pending) setOpen(nextOpen);
            }}
        >
            <DialogTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors",
                        compact
                            ? "h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            : "h-10 border border-border bg-card px-3 text-foreground hover:border-destructive/35 hover:bg-destructive/5 hover:text-destructive",
                        reportId && "text-success hover:text-success",
                        className
                    )}
                    aria-label={
                        reportId
                            ? "Update your issue report"
                            : "Report an issue"
                    }
                >
                    {reportId ? (
                        <CheckCircle2 size={compact ? 14 : 16} />
                    ) : (
                        <AlertTriangle size={compact ? 14 : 16} />
                    )}
                    <span className={compact ? "hidden sm:inline" : undefined}>
                        {reportId ? "Reported" : "Report issue"}
                    </span>
                </button>
            </DialogTrigger>

            <DialogContent
                onEscapeKeyDown={(event) => {
                    if (pending) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                    if (pending) event.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Report an issue</DialogTitle>
                    <DialogDescription>
                        Tell us what looks wrong. Your answer and exam score
                        will not be affected.
                    </DialogDescription>
                </DialogHeader>

                <label className="mt-6 block">
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        What is wrong?
                    </span>
                    <select
                        autoFocus
                        value={category}
                        onChange={(event) =>
                            setCategory(
                                event.target.value as ReportCategoryValue
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
                        onChange={(event) => setComment(event.target.value)}
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
                    {reportId && (
                        <button
                            type="button"
                            onClick={withdraw}
                            disabled={pending}
                            className="h-11 rounded-xl border border-destructive/30 px-4 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60 sm:mr-auto"
                        >
                            Withdraw report
                        </button>
                    )}
                    <DialogClose asChild>
                        <button
                            type="button"
                            disabled={pending}
                            className="h-11 rounded-xl border border-border px-4 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60"
                        >
                            Cancel
                        </button>
                    </DialogClose>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={pending}
                        className="h-11 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                        {pending ? "Sending…" : "Send report"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
