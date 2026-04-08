// app/(main)/dashboard/exam/[examId]/page.tsx
import { getExamDashboard } from "@/app/(main)/actions/dashboard-actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RefreshCcw, Clock } from "lucide-react";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import SubjectBreakdown from "@/components/SubjectBreakdown";
import TopicStrengthCard from "@/components/TopicStrengthCard";
import SubjectPerformanceRadar from "@/components/SubjectPerformanceRadar";
import TestHistoryList from "@/components/TestHistoryList";

export default async function ExamDashboardPage({
    params,
}: {
    params: Promise<{ examId: string }>;
}) {
    const { examId } = await params;
    const data = await getExamDashboard(examId);

    if (!data.exam) notFound();

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

                <div>
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-900 mb-4 transition-colors">
                        <ChevronLeft size={14} className="mr-1" /> Back to Overview
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.exam.name}</h1>
                    <p className="text-slate-500 mt-1 text-sm">Detailed performance analysis across {data.testHistory.length} tests</p>
                </div>

                {/* Score trend */}
                <ScoreTrendChart data={data.trend} />
                {/* 🔥 NEW: Diagnostic Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Time Management Card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Clock size={16} /></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pacing Analysis</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-slate-400 font-bold mb-1">Time per Correct</p>
                                <p className="text-2xl font-black text-green-600">{data.diagnostics.avgCorrectTimeSec}s</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold mb-1">Time per Incorrect</p>
                                <p className="text-2xl font-black text-red-500">{data.diagnostics.avgIncorrectTimeSec}s</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-6 italic">
                            {data.diagnostics.avgIncorrectTimeSec > data.diagnostics.avgCorrectTimeSec
                                ? "You are spending too much time overthinking incorrect answers. Trust your gut!"
                                : "You are rushing through incorrect answers. Slow down and read carefully."}
                        </p>
                    </div>

                    {/* Behavioral Card ("The Second Guesser") */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><RefreshCcw size={16} /></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">The Second-Guesser</h2>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-bold mb-1">Hesitation Win Rate</p>
                                <p className="text-3xl font-black text-slate-900">{data.diagnostics.hesitationWinRate}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-bold mb-1">Total Changes</p>
                                <p className="text-lg font-bold text-slate-700">{data.diagnostics.totalHesitations}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-6 italic">
                            {data.diagnostics.hesitationWinRate > 50
                                ? "When you change your answer, you usually get it right. Good critical thinking!"
                                : "When you change your answer, you usually get it wrong. Stick to your first instinct!"}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <SubjectPerformanceRadar subjects={data.subjectStats} />
                    <SubjectBreakdown subjects={data.subjectStats} />
                </div>

                {/* Subject performance */}
                <SubjectBreakdown subjects={data.subjectStats} />

                {/* Weak / Strong topics */}
                <div className="grid md:grid-cols-2 gap-6">
                    <TopicStrengthCard
                        title="Weak Topics"
                        type="weak"
                        subjects={data.weakSubjects}
                    />
                    <TopicStrengthCard
                        title="Strong Topics"
                        type="strong"
                        subjects={data.strongSubjects}
                    />
                </div>

                {/* Test history */}
                <TestHistoryList tests={data.testHistory} />
            </main>
        </div>
    );
}