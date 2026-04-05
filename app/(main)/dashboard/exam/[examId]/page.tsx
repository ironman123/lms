import { getExamDashboard } from "@/app/(main)/actions/dashboard-actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import SubjectBreakdown from "@/components/SubjectBreakdown";
import TopicStrengthCard from "@/components/TopicStrengthCard";
import TestHistoryList from "@/components/TestHistoryList";
import ExamPerformanceCard from "@/components/ExamPerformanceCard";

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