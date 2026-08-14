"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { runQuestionAnalyticsBackfillAction } from "@/app/(main)/actions/question-analytics-actions";

export default function QuestionAnalyticsBackfillControls() {
    const [pending, startTransition] = useTransition();
    const run = (dryRun: boolean) => startTransition(async () => {
        try {
            const result = await runQuestionAnalyticsBackfillAction(dryRun);
            toast.success(
                dryRun
                    ? `${result.projectedSessions} eligible sessions found.`
                    : `${result.projectedSessions} sessions projected into durable analytics.`
            );
        } catch {
            toast.error("Question analytics backfill could not run.");
        }
    });
    return (
        <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(true)} className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-black hover:border-primary/40 disabled:opacity-60">
                {pending && <Loader2 size={14} className="mr-2 animate-spin" />} Preview backfill
            </button>
            <button type="button" disabled={pending} onClick={() => { if (window.confirm("Project up to 100 completed sessions into durable question analytics? This is safe to retry.")) run(false); }} className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60">
                Run backfill
            </button>
        </div>
    );
}
