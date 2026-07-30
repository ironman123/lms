import Link from "next/link";
import { ChevronRight } from "lucide-react";

// 🔥 5-Tier Heatmap Logic for more colorful variance
function getScoreColors(score: number) {
    if (score >= 90) return { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/25", border: "border-fuchsia-200 hover:border-fuchsia-400 dark:border-fuchsia-400/30 dark:hover:border-fuchsia-300/60", text: "text-fuchsia-700 dark:text-fuchsia-300" };
    if (score >= 75) return { bg: "bg-emerald-50 dark:bg-emerald-950/25", border: "border-emerald-200 hover:border-emerald-400 dark:border-emerald-400/30 dark:hover:border-emerald-300/60", text: "text-emerald-700 dark:text-emerald-300" };
    if (score >= 60) return { bg: "bg-blue-50 dark:bg-blue-950/25", border: "border-blue-200 hover:border-blue-400 dark:border-blue-400/30 dark:hover:border-blue-300/60", text: "text-blue-700 dark:text-blue-300" };
    if (score >= 40) return { bg: "bg-amber-50 dark:bg-amber-950/25", border: "border-amber-200 hover:border-amber-400 dark:border-amber-400/30 dark:hover:border-amber-300/60", text: "text-amber-700 dark:text-amber-300" };
    return { bg: "bg-rose-50 dark:bg-rose-950/25", border: "border-rose-200 hover:border-rose-400 dark:border-rose-400/30 dark:hover:border-rose-300/60", text: "text-rose-700 dark:text-rose-300" };
}

export default function TestHistoryList({ tests }: {
    tests: {
        sessionId: string; paperId: string; title: string; date: string;
        score: number; correct: number; total: number; accuracy: number; duration: string;
    }[]
}) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-black text-foreground mb-1">Test History</h3>
            <p className="text-xs text-muted-foreground mb-5">All tests attempted for this exam</p>
            <div className="space-y-3">
                {tests.map(test => {
                    const colors = getScoreColors(test.score); // Calculate colors once per test

                    return (
                        <Link
                            key={test.sessionId}
                            href={`/results/${test.sessionId}`}
                            className={`group flex items-center gap-4 rounded-xl border p-4 text-card-foreground transition-colors ${colors.bg} ${colors.border}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-bold text-foreground truncate">{test.title}</span>
                                    <span className="text-[11px] text-muted-foreground shrink-0">{test.date}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Score</p>
                                        <p className={`text-sm font-black ${colors.text}`}>{test.score}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Correct</p>
                                        <p className={`text-sm font-black ${colors.text}`}>{test.correct}/{test.total}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Accuracy</p>
                                        <p className="text-sm font-black text-foreground">{test.accuracy}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Time</p>
                                        <p className="text-sm font-black text-foreground">{test.duration}</p>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground/80 transition-colors shrink-0" />
                        </Link>
                    )
                })}
                {tests.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No tests attempted yet</p>
                )}
            </div>
        </div>
    );
}
