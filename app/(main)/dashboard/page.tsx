import { getDashboardOverview } from "@/app/(main)/actions/dashboard-actions";
import StatCard from "@/components/StatCard";
import ExamPerformanceCard from "@/components/ExamPerformanceCard";
import { Target, Trophy, Zap, BookOpen } from "lucide-react";

export default async function DashboardPage() {
    const { totalTests, totalQuestions, avgScore, accuracy, examStats } = await getDashboardOverview();

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">

                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Performance <span className="text-slate-400 font-light">Analytics</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Detailed insights into your exam preparation and progress</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Target} label="Tests Attempted" value={totalTests} badge="Total" color="blue" />
                    <StatCard icon={Trophy} label="Average Score" value={`${avgScore.toFixed(1)}%`} badge="Avg" color="green" />
                    <StatCard icon={Zap} label="Overall Accuracy" value={`${accuracy.toFixed(1)}%`} badge="Rate" color="purple" />
                    <StatCard icon={BookOpen} label="Questions Solved" value={totalQuestions} badge="Count" color="orange" />
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
                            examStats.map(exam => <ExamPerformanceCard key={exam.examId} {...exam} />)
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}