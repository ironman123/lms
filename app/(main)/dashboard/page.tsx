import { getDashboardOverview } from "@/app/(main)/actions/dashboard-actions";
import StatCard from "@/components/StatCard";
import ExamPerformanceCard from "@/components/ExamPerformanceCard";
import { Target, Trophy, Zap, BookOpen, Clock, ArrowRight, Flame } from "lucide-react";
import Link from "next/link";

function getHeatmapColor(score: number) {
    if (score >= 90) return "bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-400";
    if (score >= 75) return "bg-emerald-50 border-emerald-100 hover:border-emerald-200";
    if (score >= 60) return "bg-blue-50 border-blue-100 hover:border-blue-200";
    if (score >= 40) return "bg-amber-50 border-amber-100 hover:border-amber-200";
    return "bg-rose-50 border-rose-100 hover:border-rose-200";
}

function getActivityColor(count: number) {
    if (count === 0) return "bg-slate-100 border-slate-200";
    if (count < 10) return "bg-emerald-200 border-emerald-300";
    if (count < 25) return "bg-emerald-400 border-emerald-500";
    return "bg-emerald-600 border-emerald-700";
}

export default async function DashboardPage() {
    const { totalTests, totalQuestions, avgScore, accuracy, examStats,
        timeSpentStr, recentActivity, weakSubject, currentStreak,
        typeStats, diffStats, heatmapData
    } = await getDashboardOverview();

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">

                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Performance <span className="text-slate-400 font-light">Analytics</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Detailed insights into your exam preparation and progress</p>
                </div>
                {weakSubject && (
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-violet-200 mb-2">
                                <Flame size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">Recommended Focus</span>
                            </div>
                            <h2 className="text-2xl font-black mb-1">Target your weakness in {weakSubject.name}</h2>
                            <p className="text-violet-100 text-sm">Your accuracy has dropped to {Math.round(weakSubject.accuracy)}%. A quick practice session can help pull it back up.</p>
                        </div>
                        <Link
                            href="/library/paper" // Or wherever they generate quick practice tests
                            className="shrink-0 bg-white text-violet-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            Practice {weakSubject.name} <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Flame} label="Current Streak" value={`${currentStreak} Days`} badge="Hot" color="red" />
                    <StatCard icon={Target} label="Tests Attempted" value={totalTests} badge="Total" color="blue" />
                    <StatCard icon={Trophy} label="Average Score" value={`${avgScore.toFixed(1)}%`} badge="Avg" color="green" />
                    <StatCard icon={Zap} label="Overall Accuracy" value={`${accuracy.toFixed(1)}%`} badge="Rate" color="purple" />
                    <StatCard icon={BookOpen} label="Questions Solved" value={totalQuestions} badge="Count" color="orange" />
                    <StatCard icon={Clock} label="Time Studied" value={timeSpentStr} badge="Total" color="rose" />
                </div>

                {/* 🔥 NEW: 30-Day Consistency Heatmap */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">30-Day Consistency</h2>
                    <div className="flex flex-wrap gap-1.5">
                        {heatmapData.map((day, i) => (
                            <div
                                key={i} title={`${day.count} questions on ${day.date}`}
                                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md border ${getActivityColor(day.count)} transition-all hover:scale-110`}
                            />
                        ))}
                    </div>
                </div>

                {/* Exam-wise */}
                <div>
                    <h2 className="text-lg font-black text-slate-900 mb-4">Exam-wise Performance</h2>
                    <div className="space-y-4">
                        {examStats.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                                <p className="text-slate-400 font-medium">No tests attempted yet.</p>
                                <p className="text-slate-300 text-sm mt-1">Start a mock test to see your analytics here.</p>
                            </div>
                        ) : (
                            examStats.map(exam => <ExamPerformanceCard key={exam.examId} {...exam} trend={exam.trend as "improving" | "declining" | "neutral"} />)
                        )}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">By Difficulty</h2>
                    <div className="space-y-4">
                        {diffStats.map(stat => (
                            <div key={stat.diff}>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-slate-600">{stat.diff}</span>
                                    <span className={stat.accuracy >= 70 ? 'text-green-600' : stat.accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}>{stat.accuracy}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${stat.accuracy >= 70 ? 'bg-green-500' : stat.accuracy >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${stat.accuracy}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔥 NEW: Type Mastery */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">By Question Type</h2>
                    <div className="space-y-4">
                        {typeStats.map(stat => (
                            <div key={stat.type} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-700">{stat.type}</span>
                                <span className="text-sm font-black text-slate-900">{stat.accuracy}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-black text-slate-900 mb-4">Recent Activity</h2>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No recent activity.</p>
                        ) : (
                            recentActivity.map(session => (
                                <div
                                    key={session.id}
                                    // Apply the heatmap color function here!
                                    className={`flex items-center justify-between p-3 rounded-xl transition-colors border ${getHeatmapColor(session.score)}`}
                                >
                                    <div className="min-w-0 pr-4">
                                        <p className="text-sm font-bold text-slate-900 truncate">{session.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{session.date}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={`text-sm font-black ${session.score >= 80 ? 'text-emerald-700' : session.score >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {session.score}%
                                        </p>
                                        <Link
                                            href={`/exam/${session.paperId}/results?sessionId=${session.id}`}
                                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:underline"
                                        >
                                            Review
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}