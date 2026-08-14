"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, CheckCircle2, CircleHelp, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { changeModerationCaseStatus } from "@/app/(main)/actions/moderation-actions";
import { REPORT_CATEGORY_LABELS } from "@/lib/moderation/schemas";
import type { QuestionQualityIndicator } from "@/lib/moderation/question-quality";
import type { Option } from "./PaperBuilder";
import ConfirmDialog from "./ConfirmDialog";

const STATUS = {
    INSUFFICIENT: {
        label: "Early data",
        Icon: CircleHelp,
        button: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
        dot: "bg-slate-400",
    },
    HEALTHY: {
        label: "Healthy",
        Icon: CheckCircle2,
        button: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        dot: "bg-emerald-500",
    },
    REVIEW: {
        label: "Review",
        Icon: TriangleAlert,
        button: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        dot: "bg-amber-500",
    },
    ESCALATED: {
        label: "Escalated",
        Icon: ShieldAlert,
        button: "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
        dot: "bg-red-500",
    },
} as const;

function formatSeconds(value: number | null) {
    if (value === null) return "—";
    if (value < 60) return `${value}s`;
    return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function selectionLabel(value: string, options: Option[]) {
    const indexes = value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((index) => Number.isInteger(index) && index >= 0);
    if (indexes.length === 0) return value || "No selection";
    const labels = indexes
        .map((index) => options.find((option) => option.index === index)?.label ?? String(index + 1));
    return `Option${labels.length === 1 ? "" : "s"} ${labels.join(" + ")}`;
}

export default function QuestionQualityIndicator({
    quality,
    options,
}: {
    quality: QuestionQualityIndicator;
    options: Option[];
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [dismissOpen, setDismissOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const status = STATUS[quality.status];
    const StatusIcon = status.Icon;
    const maxSelections = Math.max(...quality.optionSelections.map((entry) => entry.count), 1);

    const dismissAsValid = () => {
        if (!quality.caseId) return;
        startTransition(async () => {
            const result = await changeModerationCaseStatus({
                caseId: quality.caseId!,
                status: "DISMISSED",
                note: "Reviewed in Paper Builder: question is valid as written.",
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Report dismissed as valid.");
            setOpen(false);
            setDismissOpen(false);
            router.refresh();
        });
    };

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${status.button}`}
            >
                <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden />
                <StatusIcon size={12} aria-hidden />
                Quality: {status.label}
            </button>

            {open && (
                <section className="mt-3 rounded-xl border border-border bg-background p-4 shadow-sm" aria-label="Question quality evidence">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-foreground">Quality evidence</p>
                            <p className="mt-1 text-xs text-muted-foreground">{quality.reason}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${status.button}`}>
                            <span className={`size-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Metric label="Graded" value={String(quality.objectiveAttemptCount)} />
                        <Metric label="Accuracy" value={quality.accuracy === null ? "—" : `${quality.accuracy}%`} />
                        <Metric label="Skipped" value={quality.skipRate === null ? "—" : `${quality.skipRate}%`} />
                        <Metric label="Avg. time" value={formatSeconds(quality.averageDwellSeconds)} />
                    </div>

                    {quality.topCategories.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Student reports</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {quality.topCategories.map(({ category, count }) => (
                                    <span key={category} className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                        {REPORT_CATEGORY_LABELS[category]} · {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {quality.optionSelections.length > 0 && (
                        <div className="mt-4">
                            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><BarChart3 size={12} /> Option selections</p>
                            <div className="mt-2 space-y-2">
                                {quality.optionSelections.map(({ selectedAnswer, count }) => (
                                    <div key={selectedAnswer} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                                        <div className="min-w-0">
                                            <div className="flex justify-between gap-2"><span className="truncate font-medium">{selectionLabel(selectedAnswer, options)}</span><span className="shrink-0 text-muted-foreground">{count}</span></div>
                                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(count / maxSelections) * 100}%` }} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {quality.confidence.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Confidence vs. outcome</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {quality.confidence.map((entry) => (
                                    <span key={entry.level} className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                        Level {entry.level}: {entry.correctCount} correct · {entry.incorrectCount} wrong
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {quality.caseId && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                            <Link href={`/admin/moderation/${quality.caseId}`} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-black hover:border-primary/40 hover:text-primary">
                                Review / edit report
                            </Link>
                            <button type="button" onClick={() => setDismissOpen(true)} disabled={pending} className="inline-flex h-9 items-center rounded-lg border border-emerald-300 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                                {pending ? "Saving…" : "Dismiss as valid"}
                            </button>
                        </div>
                    )}
                </section>
            )}
            <ConfirmDialog open={dismissOpen} onOpenChange={setDismissOpen} title="Dismiss this report as valid?" description="The audit note will be retained, while this question's review marker is removed." confirmLabel="Dismiss report" pending={pending} onConfirm={dismissAsValid} />
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-lg bg-muted/60 p-2.5"><p className="text-sm font-black">{value}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}
