// app/(main)/dashboard/page.tsx
import { getDashboardOverview } from "@/app/(main)/actions/dashboard-actions";
import StatCard from "@/components/StatCard";
import ExamPerformanceCard from "@/components/ExamPerformanceCard";
import { Target, Trophy, Zap, BookOpen, Clock, ArrowRight, Flame, NotebookTabs, Wrench, Gauge } from "lucide-react";
import Link from "next/link";


function getHeatmapColor(score: number) {
    if (score >= 90) return "bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-400 dark:bg-fuchsia-950/25 dark:border-fuchsia-400/30";
    if (score >= 75) return "bg-emerald-50 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-400/30";
    if (score >= 60) return "bg-blue-50 border-blue-100 hover:border-blue-200 dark:bg-blue-950/25 dark:border-blue-400/30";
    if (score >= 40) return "bg-amber-50 border-amber-100 hover:border-amber-200 dark:bg-amber-950/25 dark:border-amber-400/30";
    return "bg-rose-50 border-rose-100 hover:border-rose-200 dark:bg-rose-950/25 dark:border-rose-400/30";
}

function getScoreTextColor(score: number) {
    if (score >= 80) return "text-emerald-700 dark:text-emerald-300";
    if (score >= 40) return "text-amber-600 dark:text-amber-300";
    return "text-rose-600 dark:text-rose-300";
}

function getActivityColor(count: number) {
    if (count === 0) return "bg-muted border-border";
    if (count < 10) return "bg-emerald-200 border-emerald-300";
    if (count < 25) return "bg-emerald-400 border-emerald-500";
    return "bg-emerald-600 border-emerald-700";
}

export default async function DashboardPage() {

    const { totalTests, totalQuestions, avgScore, accuracy, examStats,
        timeSpentStr, recentActivity, weakSubject, currentStreak,
        typeStats, diffStats, heatmapData, activeMistakes, dueRepairs,
        confidenceCalibration
    } = await getDashboardOverview();

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">

                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Performance <span className="text-muted-foreground font-light">Analytics</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Detailed insights into your exam preparation and progress</p>
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
                            className="shrink-0 bg-white text-violet-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors flex items-center gap-2"
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

                <Link
                    href="/dashboard/repair"
                    className="group flex flex-col gap-5 rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card p-6 shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-600 dark:text-violet-300">
                            <Wrench size={24} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">Today’s Repair</p>
                            <h2 className="mt-1 text-xl font-black text-foreground">
                                {dueRepairs === 0 ? "You’re caught up" : `${dueRepairs} question${dueRepairs === 1 ? "" : "s"} due today`}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">Focused sets of up to 10 due mistakes, scheduled with spaced follow-ups.</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background sm:self-auto">
                        Open repair queue <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                </Link>

                <Link
                    href="/dashboard/mistakes"
                    className="group flex flex-col gap-5 rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-card to-card p-6 shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-rose-500/15 p-3 text-rose-600 dark:text-rose-300">
                            <NotebookTabs size={24} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-300">
                                Automatic Mistake Notebook
                            </p>
                            <h2 className="mt-1 text-xl font-black text-foreground">
                                {activeMistakes === 0
                                    ? "No active mistakes"
                                    : `${activeMistakes} question${activeMistakes === 1 ? "" : "s"} to repair`}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Wrong answers are captured automatically and leave the active list after two later correct attempts.
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background sm:self-auto">
                        Open notebook <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                </Link>

                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-600 dark:text-sky-300">
                            <Gauge size={24} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-600 dark:text-sky-300">Confidence calibration</p>
                            {!confidenceCalibration ? (
                                <>
                                    <h2 className="mt-1 text-xl font-black text-foreground">No confidence data yet</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Use Guess, Unsure, Sure, or Certain while answering. Your dashboard will compare belief with actual accuracy.</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="mt-1 text-xl font-black text-foreground">
                                        {confidenceCalibration.status === "CALIBRATED"
                                            ? "Your confidence is well calibrated"
                                            : confidenceCalibration.status === "OVERCONFIDENT"
                                                ? "Confidence is running ahead of accuracy"
                                                : "You know more than you think"}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Based on {confidenceCalibration.sampleCount} rated answers. Average confidence {Math.round(confidenceCalibration.averageConfidence)}%; actual accuracy {Math.round(confidenceCalibration.accuracy)}%.
                                    </p>
                                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-xl bg-background p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Gap</p>
                                            <p className="mt-1 text-lg font-black text-foreground">{confidenceCalibration.calibrationGap > 0 ? "+" : ""}{Math.round(confidenceCalibration.calibrationGap)} pts</p>
                                        </div>
                                        <div className="rounded-xl bg-background p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Confident mistakes</p>
                                            <p className="mt-1 text-lg font-black text-rose-600 dark:text-rose-300">{confidenceCalibration.highConfidenceWrong}</p>
                                        </div>
                                        <div className="rounded-xl bg-background p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hidden strengths</p>
                                            <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">{confidenceCalibration.lowConfidenceCorrect}</p>
                                        </div>
                                        <div className="rounded-xl bg-background p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rated</p>
                                            <p className="mt-1 text-lg font-black text-foreground">{confidenceCalibration.sampleCount}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* 🔥 NEW: 30-Day Consistency Heatmap */}
                <div className="bg-card border border-border rounded-3xl p-6">
                    <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">30-Day Consistency</h2>
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
                    <h2 className="text-lg font-black text-foreground mb-4">Exam-wise Performance</h2>
                    <div className="space-y-4">
                        {examStats.length === 0 ? (
                            <div className="bg-card border border-border rounded-2xl p-12 text-center">
                                <p className="text-muted-foreground font-medium">No tests attempted yet.</p>
                                <p className="text-muted-foreground/60 text-sm mt-1">Start a mock test to see your analytics here.</p>
                            </div>
                        ) : (
                            examStats.map(exam => <ExamPerformanceCard key={exam.examId} {...exam} trend={exam.trend as "improving" | "declining" | "neutral"} />)
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-3xl p-6">
                    <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">By Difficulty</h2>
                    <div className="space-y-4">
                        {diffStats.map(stat => (
                            <div key={stat.diff}>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-muted-foreground">{stat.diff}</span>
                                    <span className={stat.accuracy >= 70 ? 'text-green-600' : stat.accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}>{stat.accuracy}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${stat.accuracy >= 70 ? 'bg-green-500' : stat.accuracy >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${stat.accuracy}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔥 NEW: Type Mastery */}
                <div className="bg-card border border-border rounded-3xl p-6">
                    <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">By Question Type</h2>
                    <div className="space-y-4">
                        {typeStats.map(stat => (
                            <div key={stat.type} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/60">
                                <span className="text-xs font-bold text-foreground/80">{stat.type}</span>
                                <span className="text-sm font-black text-foreground">{stat.accuracy}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-black text-foreground mb-4">Recent Activity</h2>
                    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                        ) : (
                            recentActivity.map(session => (
                                <div
                                    key={session.id}
                                    // Apply the heatmap color function here!
                                    className={`flex items-center justify-between p-3 rounded-xl transition-colors border ${getHeatmapColor(session.score)}`}
                                >
                                    <div className="min-w-0 pr-4">
                                        <p className="text-sm font-bold text-foreground truncate">{session.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{session.date}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={`text-sm font-black ${getScoreTextColor(session.score)}`}>
                                            {session.score}%
                                        </p>
                                        <Link
                                            href={`/results/${session.id}`}
                                            className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:underline"
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
