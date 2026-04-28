// app/(session)/results/[paperId]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, BarChart3 } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────────

// The shape we store in options Json (must match what questionSchema produces)
type OptionJSON = { text: string; label?: string };

// ── Helper: derive a human-readable correct-answer string ────────────────────

function getCorrectAnswerText(
    type: string,
    options: Prisma.JsonValue,
    correctOptions: number[],
    exactAnswer: number | null,
    answerMin: number | null,
    answerMax: number | null,
    modelAnswer: string | null
): string | null {
    if (type === "MCQ" || type === "MSQ")
    {
        const opts = options as OptionJSON[] | null;
        if (!opts?.length || !correctOptions.length) return null;
        return correctOptions
            .map((idx) => opts[idx]?.text)
            .filter(Boolean)
            .join(", ");
    }
    if (type === "NUMERICAL")
    {
        if (exactAnswer != null) return String(exactAnswer);
        if (answerMin != null && answerMax != null)
            return `${answerMin} – ${answerMax}`;
    }
    if (type === "SUBJECTIVE") return modelAnswer ?? null;
    return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
                        // `options` is Json — already on the row, no separate include.
                        question: true,
                    },
                    orderBy: { question: { createdAt: "asc" } },
                },
            },
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

    // ── Stats ──────────────────────────────────────────────────────────────
    // `completeExamSession` already computed and stored these — trust the DB.
    const correctCount = session.correctCount;
    const attemptedCount = session.attemptedCount;
    const totalQuestions = interactions.length;
    const skippedCount = totalQuestions - attemptedCount;
    const wrongCount = attemptedCount - correctCount;

    // totalScore is stored as a 0-100 percentage; derive raw marks for display.
    const totalMarks = interactions.reduce((sum, i) => sum + i.question.marks, 0);
    const earnedMarks = totalMarks * ((session.totalScore ?? 0) / 100);

    const accuracy = session.accuracy ?? 0;
    const durationMin = session.timeTakenSecs
        ? Math.floor(session.timeTakenSecs / 60)
        : session.endTime
            ? Math.floor(
                (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
                60000
            )
            : 0;

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-3xl mx-auto px-4 space-y-6">

                {/* Header */}
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Results
                    </p>
                    <h1 className="text-3xl font-black text-slate-900">{paper.title}</h1>
                    {exam && <p className="text-slate-500 mt-1">{exam.name}</p>}
                </div>

                {/* Score card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
                    <div className="text-6xl font-black text-slate-900 mb-1">
                        {earnedMarks.toFixed(1)}
                        <span className="text-2xl text-slate-400 font-light">/{totalMarks}</span>
                    </div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                        Total Score
                    </p>

                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-green-600">{correctCount}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Correct
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-red-500">{wrongCount}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Wrong
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <p className="text-2xl font-black text-slate-400">{skippedCount}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Skipped
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                            <BarChart3 size={16} className="text-slate-400" />
                            <div className="text-left">
                                <p className="text-sm font-black text-slate-900">
                                    {Math.round(accuracy)}%
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                    Accuracy
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                            <Clock size={16} className="text-slate-400" />
                            <div className="text-left">
                                <p className="text-sm font-black text-slate-900">{durationMin}m</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                    Time taken
                                </p>
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
                        // `isCorrect` is persisted by completeExamSession — use it directly.
                        const isCorrect = interaction.isCorrect;
                        const wasAttempted = !!interaction.selectedAnswer;

                        const correctAnswerText =
                            wasAttempted && !isCorrect
                                ? getCorrectAnswerText(
                                    q.type,
                                    q.options,
                                    q.correctOptions,
                                    q.exactAnswer,
                                    q.answerMin,
                                    q.answerMax,
                                    q.modelAnswer
                                )
                                : null;

                        return (
                            <div
                                key={interaction.id}
                                className={`bg-white rounded-2xl border p-5 ${!wasAttempted
                                        ? "border-slate-200"
                                        : isCorrect
                                            ? "border-green-200"
                                            : "border-red-200"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        {!wasAttempted ? (
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                                        ) : isCorrect ? (
                                            <CheckCircle2 size={20} className="text-green-500" />
                                        ) : (
                                            <XCircle size={20} className="text-red-500" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 leading-snug">
                                            {i + 1}. {q.content}
                                        </p>

                                        {correctAnswerText && (
                                            <p className="text-xs text-green-600 font-bold mt-2">
                                                Correct: {correctAnswerText}
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