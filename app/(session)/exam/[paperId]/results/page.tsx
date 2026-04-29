// app/results/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Trophy, BarChart3 } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export default async function ResultsPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionId?: string }>;
}) {
    const { paperId } = await params;
    const { sessionId } = await searchParams;
    const user = await requireAuth();

    if (!sessionId) notFound();

    const [session, paper] = await Promise.all([
        prisma.testSession.findUnique({
            where: { id: sessionId, userId: user.id },
            include: {
                interactions: {
                    include: {
                        question: {
                            // Replaced include with select to handle the new JSONB/array fields
                            select: {
                                id: true,
                                content: true,
                                marks: true,
                                type: true,
                                explanation: true,
                                correctOptions: true,
                                exactAnswer: true,
                                answerMin: true,
                                answerMax: true,
                                options: true, // JSON field
                            }
                        }
                    }
                }
            }
        }),
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                examQuestionPaperLinks: {
                    include: { exam: { select: { name: true, slug: true, duration: true } } },
                    take: 1,
                },
            },
        }),
    ]);

    if (!session || !paper) notFound();

    const exam = paper.examQuestionPaperLinks[0]?.exam;
    const interactions = session.interactions;

    // Score calculation with new schema logic
    const attempted = interactions.filter(i => i.selectedAnswer);
    const correct = interactions.filter(i => {
        if (!i.selectedAnswer) return false;
        const q = i.question;

        if (q.type === "MCQ")
        {
            return q.correctOptions[0] === parseInt(i.selectedAnswer, 10);
        }
        if (q.type === "MSQ")
        {
            const submitted = i.selectedAnswer.split(",").map(Number).sort().join(",");
            const correctIds = [...q.correctOptions].sort().join(",");
            return submitted === correctIds;
        }
        if (q.type === "NUMERICAL")
        {
            const val = parseFloat(i.selectedAnswer);
            if (q.exactAnswer != null) return val === q.exactAnswer;
            if (q.answerMin != null && q.answerMax != null)
            {
                return val >= q.answerMin && val <= q.answerMax;
            }
        }
        return false;
    });

    const totalMarks = interactions.reduce((sum, i) => sum + i.question.marks, 0);
    const earnedMarks = correct.reduce((sum, i) => sum + i.question.marks, 0);
    const accuracy = attempted.length > 0 ? Math.round((correct.length / attempted.length) * 100) : 0;

    const durationMs = session.endTime
        ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
        : 0;
    const durationMin = Math.floor(durationMs / 60000);

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-3xl mx-auto px-4 space-y-6">

                {/* Header */}
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Results</p>
                    <h1 className="text-3xl font-black text-slate-900">{paper.title}</h1>
                    {exam && <p className="text-slate-500 mt-1">{exam.name}</p>}
                </div>

                {/* Score card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
                    <div className="text-6xl font-black text-slate-900 mb-1">
                        {earnedMarks.toFixed(1)}
                        <span className="text-2xl text-slate-400 font-light">/{totalMarks}</span>
                    </div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Total Score</p>

                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-green-600">{correct.length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Correct</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-red-500">{attempted.length - correct.length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Wrong</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-slate-400">{interactions.length - attempted.length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Skipped</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                            <BarChart3 size={16} className="text-slate-400" />
                            <div className="text-left">
                                <p className="text-sm font-black text-slate-900">{accuracy}%</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Accuracy</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                            <Clock size={16} className="text-slate-400" />
                            <div className="text-left">
                                <p className="text-sm font-black text-slate-900">{durationMin}m</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Time taken</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question review */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                        Question Review
                    </h2>
                    {interactions.map((interaction, i) => {
                        const q = interaction.question;
                        const isCorrectAnswer = correct.includes(interaction);
                        const wasAttempted = !!interaction.selectedAnswer;

                        // Formatting the correct answer for display
                        let displayCorrectAnswer = "";
                        if (q.type === "MCQ" || q.type === "MSQ")
                        {
                            // Map [0, 1] -> "A, B"
                            displayCorrectAnswer = q.correctOptions
                                .sort()
                                .map((idx: number) => String.fromCharCode(65 + idx))
                                .join(", ");
                        } else if (q.type === "NUMERICAL")
                        {
                            if (q.exactAnswer != null)
                            {
                                displayCorrectAnswer = String(q.exactAnswer);
                            } else if (q.answerMin != null && q.answerMax != null)
                            {
                                displayCorrectAnswer = `${q.answerMin} - ${q.answerMax}`;
                            } else
                            {
                                displayCorrectAnswer = "—";
                            }
                        }

                        return (
                            <div key={interaction.id} className={`bg-white rounded-2xl border p-5 ${!wasAttempted ? "border-slate-200" :
                                isCorrectAnswer ? "border-green-200" : "border-red-200"
                                }`}>
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        {!wasAttempted
                                            ? <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                                            : isCorrectAnswer
                                                ? <CheckCircle2 size={20} className="text-green-500" />
                                                : <XCircle size={20} className="text-red-500" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 leading-snug">
                                            {i + 1}. {q.content}
                                        </p>

                                        {/* Display formatted correct answer for wrong attempts */}
                                        {wasAttempted && !isCorrectAnswer && displayCorrectAnswer && (
                                            <p className="text-xs text-green-600 font-bold mt-2">
                                                Correct: {displayCorrectAnswer}
                                            </p>
                                        )}

                                        {q.explanation && (
                                            <p className="text-xs text-slate-400 italic mt-2 leading-relaxed">
                                                {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                        {q.marks}M
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pb-8">
                    <Link
                        href={`/exam/${paperId}/lobby`}
                        className="flex-1 h-12 flex items-center justify-center border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-400 transition-colors"
                    >
                        Retake
                    </Link>
                    {exam && (
                        <Link
                            href={`/library/exam/${exam.slug}`}
                            className="flex-1 h-12 flex items-center justify-center bg-slate-900 rounded-2xl text-sm font-bold text-white hover:bg-slate-700 transition-colors"
                        >
                            Back to {exam.name}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}