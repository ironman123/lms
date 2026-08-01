import Link from "next/link";
import {
    ChevronRight,
    Minus,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

const TREND_CONFIG = {
    improving: {
        icon: TrendingUp,
        label: "Improving",
        class: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-400/30",
    },
    declining: {
        icon: TrendingDown,
        label: "Declining",
        class: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-400/30",
    },
    neutral: {
        icon: Minus,
        label: "Stable",
        class: "text-muted-foreground bg-background border-border",
    },
};

export default function ExamPerformanceCard({
    examId,
    examName,
    testsAttempted,
    avgScore,
    bestScore,
    trend,
}: {
    examId: string;
    examName: string;
    examSlug: string;
    testsAttempted: number;
    avgScore: number;
    bestScore: number;
    trend: "improving" | "declining" | "neutral";
}) {
    const trendConfig = TREND_CONFIG[trend];
    const TrendIcon = trendConfig.icon;

    return (
        <article className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/25 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-lg font-black leading-snug text-foreground">
                        {examName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                            {testsAttempted} test
                            {testsAttempted !== 1 ? "s" : ""} attempted
                        </p>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${trendConfig.class}`}
                        >
                            <TrendIcon size={11} /> {trendConfig.label}
                        </span>
                    </div>
                </div>
                <Link
                    href={`/dashboard/exam/${examId}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:border-primary/35 hover:text-primary sm:h-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-1 sm:text-muted-foreground"
                >
                    View details <ChevronRight size={14} />
                </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/8 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Average score
                    </p>
                    <p className="mt-1 text-xl font-black text-blue-800 dark:text-blue-200">
                        {avgScore.toFixed(1)}%
                    </p>
                </div>
                <div className="rounded-xl border border-green-500/15 bg-green-500/8 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-green-700 dark:text-green-300">
                        Best score
                    </p>
                    <p className="mt-1 text-xl font-black text-green-800 dark:text-green-200">
                        {bestScore.toFixed(1)}%
                    </p>
                </div>
            </div>
        </article>
    );
}
