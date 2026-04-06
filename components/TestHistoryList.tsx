import Link from "next/link";
import { ChevronRight } from "lucide-react";

// 🔥 5-Tier Heatmap Logic for more colorful variance
function getScoreColors(score: number) {
    if (score >= 90) return { bg: "bg-fuchsia-50", border: "border-fuchsia-200 hover:border-fuchsia-400", text: "text-fuchsia-700" }; // Outstanding
    if (score >= 75) return { bg: "bg-emerald-50", border: "border-emerald-200 hover:border-emerald-400", text: "text-emerald-700" }; // Great
    if (score >= 60) return { bg: "bg-blue-50", border: "border-blue-200 hover:border-blue-400", text: "text-blue-700" };       // Good
    if (score >= 40) return { bg: "bg-amber-50", border: "border-amber-200 hover:border-amber-400", text: "text-amber-700" };     // Needs Work
    return { bg: "bg-rose-50", border: "border-rose-200 hover:border-rose-400", text: "text-rose-700" };                          // Poor
}

export default function TestHistoryList({ tests }: {
    tests: {
        sessionId: string; paperId: string; title: string; date: string;
        score: number; correct: number; total: number; accuracy: number; duration: number;
    }[]
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-900 mb-1">Test History</h3>
            <p className="text-xs text-slate-400 mb-5">All tests attempted for this exam</p>
            <div className="space-y-3">
                {tests.map(test => {
                    const colors = getScoreColors(test.score); // Calculate colors once per test

                    return (
                        <Link
                            key={test.sessionId}
                            href={`/exam/${test.paperId}/results?sessionId=${test.sessionId}`}
                            className={`flex items-center gap-4 p-4 border rounded-xl transition-colors group ${colors.bg} ${colors.border}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-bold text-slate-900 truncate">{test.title}</span>
                                    <span className="text-[11px] text-slate-500 shrink-0">{test.date}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Score</p>
                                        <p className={`text-sm font-black ${colors.text}`}>{test.score}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Correct</p>
                                        <p className={`text-sm font-black ${colors.text}`}>{test.correct}/{test.total}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Accuracy</p>
                                        <p className="text-sm font-black text-slate-900">{test.accuracy}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Time</p>
                                        <p className="text-sm font-black text-slate-900">{test.duration}m</p>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                        </Link>
                    )
                })}
                {tests.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No tests attempted yet</p>
                )}
            </div>
        </div>
    );
}