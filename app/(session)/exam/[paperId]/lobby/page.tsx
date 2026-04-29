//lobby/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StartExamButton from "@/components/StartExamButton";
import { Timer, ClipboardCheck, AlertCircle, BookOpen, Layers, Trophy } from "lucide-react";
import Link from "next/link";
import { SessionMode } from "@prisma/client";

export default async function PaperLobbyPage({ params }: { params: Promise<{ id: string, paperId: string }> }) {
    const { id, paperId } = await params;

    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: {
            examQuestionPaperLinks: {
                include: {
                    exam: true
                }
            },
            questions: {
                select: {
                    type: true,
                    marks: true, // Fetch marks for summation
                    topic: {
                        select: {
                            category: { select: { name: true } }
                        }
                    }
                }
            },
            _count: { select: { questions: true } }
        }
    });

    if (!paper) notFound();
    const currentExam = paper.examQuestionPaperLinks.find(link => link.examId === id)?.exam
        || paper.examQuestionPaperLinks[0]?.exam;

    const examDuration = currentExam?.duration || 0;

    // 1. Dynamic Total Marks Calculation
    const totalMarks = paper.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    // 2. Group by Subject (Category)
    const categoryDistribution = paper.questions.reduce((acc: Record<string, number>, q) => {
        const catName = q.topic?.category?.name || "General";
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
    }, {});

    // 3. Group by Question Type
    const typeStats = {
        mcq: paper.questions.filter(q => q.type === 'MCQ').length,
        numerical: paper.questions.filter(q => q.type === 'NUMERICAL').length,
        msq: paper.questions.filter(q => q.type === 'MSQ').length,
        sub: paper.questions.filter(q => q.type === "SUBJECTIVE").length
    };

    return (
        <div className=" w-full bg-slate-50 py-12">
            <main className="max-w-4xl mx-auto px-4">
                <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl p-8 md:p-12 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 z-0" />

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entrance Lobby</span>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2 italic">
                                {paper.title} <span className="text-slate-400 font-light not-italic">Workspace</span>
                            </h1>
                        </div>

                        {/* Top Stats - Now 3 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600"><Timer size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Time</p>
                                    <p className="font-black text-slate-900">{examDuration}m</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-green-600"><ClipboardCheck size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Questions</p>
                                    <p className="font-black text-slate-900">{paper._count.questions} Qs</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-500"><Trophy size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Maximum</p>
                                    <p className="font-black text-slate-900">{totalMarks} Marks</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mb-10">
                            {/* Subject Breakdown */}
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <BookOpen size={14} /> Subject Breakdown
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(categoryDistribution).map(([name, count]) => (
                                        <div key={name} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm transition-hover hover:border-slate-300">
                                            <span className="text-xs font-bold text-slate-700">{name}</span>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">{count} Qs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Format details */}
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Layers size={14} /> Format details
                                </h3>
                                <div className="space-y-2">
                                    {typeStats.mcq > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-lg">
                                            <span className="text-xs font-bold">Multiple Choice</span>
                                            <span className="text-[10px] font-black opacity-70">{typeStats.mcq} Items</span>
                                        </div>
                                    )}
                                    {typeStats.msq > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <span className="text-xs font-bold text-slate-700">Multiple Select</span>
                                            <span className="text-[10px] font-black text-slate-400">{typeStats.msq} Items</span>
                                        </div>
                                    )}
                                    {typeStats.sub > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-lg">
                                            <span className="text-xs font-bold">Subjective</span>
                                            <span className="text-[10px] font-black opacity-70">{typeStats.sub} Items</span>
                                        </div>
                                    )}
                                    {typeStats.numerical > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <span className="text-xs font-bold text-slate-700">Numerical Entry</span>
                                            <span className="text-[10px] font-black text-slate-400">{typeStats.numerical} Items</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="p-6 bg-amber-50/50 rounded-[2rem] border border-amber-100 mb-10">
                            <h3 className="font-black text-amber-900 text-sm flex items-center gap-2 mb-3">
                                <AlertCircle size={16} /> Exam Protocol
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-xs text-amber-800 leading-relaxed font-medium">
                                    <span className="font-black underline block mb-1">Mock Exam Mode</span>
                                    Full simulation. Timer will be active. Answers and explanations will be locked until the test is submitted.
                                </div>
                                <div className="text-xs text-amber-800 leading-relaxed font-medium">
                                    <span className="font-black underline block mb-1">Practice Mode</span>
                                    Learning focused. No timer pressure. You can view correct answers and detailed explanations after every question.
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* <Button asChild variant="outline" className="flex-1 h-16 rounded-2xl border-2 border-slate-200 font-black text-lg hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-95">
                                <Link href={`/exam/${paperId}/practice`}>Practice</Link>
                            </Button> */}
                            <StartExamButton
                                examId={id}
                                paperId={paperId}
                                mode={SessionMode.PRACTICE}
                                label="Practice"
                                variant="outline"
                            />
                            <StartExamButton
                                examId={id}
                                paperId={paperId}
                                mode={SessionMode.MOCK}
                                label="Start Exam"
                                variant="default"
                            />
                            {/* <Button asChild className="flex-1 h-16 rounded-2xl bg-slate-900 font-black text-lg hover:bg-slate-800 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 text-white">
                                <Link href={`/exam/${id}/paper/${paperId}/mock`}>Start Exam</Link>
                            </Button> */}
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
}