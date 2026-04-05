import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
                {tests.map(test => (
                    <Link
                        key={test.sessionId}
                        href={`/exam/${test.paperId}/results?sessionId=${test.sessionId}`}
                        className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:border-slate-300 transition-colors group"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-slate-900 truncate">{test.title}</span>
                                <span className="text-[11px] text-slate-400 shrink-0">{test.date}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Score</p>
                                    <p className="text-sm font-black text-blue-600">{test.score}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Correct</p>
                                    <p className="text-sm font-black text-green-600">{test.correct}/{test.total}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Accuracy</p>
                                    <p className="text-sm font-black text-slate-900">{test.accuracy}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Time</p>
                                    <p className="text-sm font-black text-slate-900">{test.duration}m</p>
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
                    </Link>
                ))}
                {tests.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No tests attempted yet</p>
                )}
            </div>
        </div>
    );
}