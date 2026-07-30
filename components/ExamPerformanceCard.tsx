import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

const TREND_CONFIG = {
    improving: { icon: TrendingUp, label: "Improving", class: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-400/30" },
    declining: { icon: TrendingDown, label: "Declining", class: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-400/30" },
    neutral: { icon: Minus, label: "Stable", class: "text-muted-foreground bg-background border-border" },
};

export default function ExamPerformanceCard({
    examId, examName, examSlug, testsAttempted, avgScore, bestScore, trend
}: {
    examId: string; examName: string; examSlug: string;
    testsAttempted: number; avgScore: number; bestScore: number;
    trend: "improving" | "declining" | "neutral";
}) {
    const t = TREND_CONFIG[trend];
    const TrendIcon = t.icon;
    const improvementScope = 100 - bestScore;

    return (
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-foreground/25 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-foreground">{examName}</h3>
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${t.class}`}>
                            <TrendIcon size={11} /> {t.label}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{testsAttempted} test{testsAttempted !== 1 ? "s" : ""} attempted</p>
                </div>
                <Link
                    href={`/dashboard/exam/${examId}`}
                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    View details <ChevronRight size={13} />
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
                    <p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider">Avg Score</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-200 mt-0.5">{avgScore.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
                    <p className="text-[10px] text-green-600 dark:text-green-300 font-bold uppercase tracking-wider">Best Score</p>
                    <p className="text-lg font-black text-green-700 dark:text-green-200 mt-0.5">{bestScore.toFixed(1)}%</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                    <p className="text-[10px] text-amber-600 dark:text-amber-300 font-bold uppercase tracking-wider">Scope</p>
                    <p className="text-lg font-black text-amber-700 dark:text-amber-200 mt-0.5">{improvementScope.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
}
