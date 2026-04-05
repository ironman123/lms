import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

const TREND_CONFIG = {
    improving: { icon: TrendingUp, label: "Improving", class: "text-green-600 bg-green-50 border-green-200" },
    declining: { icon: TrendingDown, label: "Declining", class: "text-red-600 bg-red-50 border-red-200" },
    neutral: { icon: Minus, label: "Stable", class: "text-slate-500 bg-slate-50 border-slate-200" },
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-900">{examName}</h3>
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${t.class}`}>
                            <TrendIcon size={11} /> {t.label}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400">{testsAttempted} test{testsAttempted !== 1 ? "s" : ""} attempted</p>
                </div>
                <Link
                    href={`/dashboard/exam/${examId}`}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                    View details <ChevronRight size={13} />
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Avg Score</p>
                    <p className="text-lg font-black text-blue-700 mt-0.5">{avgScore.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Best Score</p>
                    <p className="text-lg font-black text-green-700 mt-0.5">{bestScore.toFixed(1)}%</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Scope</p>
                    <p className="text-lg font-black text-amber-700 mt-0.5">{improvementScope.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
}