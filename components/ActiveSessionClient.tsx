"use client";

import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Flag, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import SessionTimer from "./SessionTimer";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DevMetricsOverlay from "./DevMetricsOverlay";
import { useExamTelemetry } from "@/app/(main)/hooks/useExamTelemetry";

export default function ActiveSessionClient({ paper, mode, sessionId, userId }: any) {
    const router = useRouter();
    const durationInMinutes = paper?.examQuestionPaperLinks[0]?.exam.duration || 60;

    // ==========================================
    // 1. FAST UI STATE
    // ==========================================
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const numericalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isLocked, setIsLocked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = paper.questions[currentIndex];
    const totalQuestions = paper.questions.length;
    const isLastQuestion = currentIndex === totalQuestions - 1;

    const progress = useMemo(() =>
        totalQuestions > 0 ? (Object.keys(answers).length / totalQuestions) * 100 : 0,
        [answers, totalQuestions]
    );

    // ==========================================
    // 2. BACKGROUND TELEMETRY
    // ==========================================
    const {
        currentMetrics,
        recentActivities,
        handleNavigation,
        handleAnswerSelection,
        flushAndSubmit,
        toggleFlag: telemetryToggleFlag,
    } = useExamTelemetry(sessionId, currentQuestion?.id || "");

    // ==========================================
    // 3. COMBINED ACTIONS
    // ==========================================
    const onNavigate = (newIndex: number) => {
        if (isLocked) return;
        setCurrentIndex(newIndex);
        setShowAnswer(false);
        handleNavigation(paper.questions[newIndex].id);
    };

    const onSelectOption = (optionId: string, isCorrect: boolean) => {
        if (isLocked) return;

        if (currentQuestion.type === "MSQ")
        {
            setAnswers(prev => {
                const current = (prev[currentQuestion.id] as string[]) ?? [];
                const already = current.includes(optionId);
                const updated = already
                    ? current.filter(id => id !== optionId)
                    : [...current, optionId];
                handleAnswerSelection(currentQuestion.id, updated.join(","), isCorrect, "MSQ");
                return { ...prev, [currentQuestion.id]: updated };
            });
        } else
        {
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
            handleAnswerSelection(currentQuestion.id, optionId, isCorrect, "MCQ");
        }
    };

    const onNumericalChange = (value: string) => {
        if (isLocked) return;
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));

        if (numericalTimeoutRef.current) clearTimeout(numericalTimeoutRef.current);
        numericalTimeoutRef.current = setTimeout(() => {
            if (value.trim())
            {
                handleAnswerSelection(currentQuestion.id, value, false, "NUMERICAL");
            }
        }, 1500);
    };

    const handleSubmit = async () => {
        const unanswered = totalQuestions - Object.keys(answers).length;
        if (unanswered > 0 && !confirm(`${unanswered} unanswered. Submit anyway?`)) return;

        // 🔥 FIX: Lock the UI immediately so they can't click anything else
        setIsSubmitting(true);
        setIsLocked(true);

        await flushAndSubmit(
            answers,
            () => {
                // Instantly redirect when successful!
                //router.push(`/results?sessionId=${sessionId}`);
                //router.replace(`/results?paperId=${paper.id}&sessionId=${sessionId}`);
                router.replace(`/results/${paper.id}?sessionId=${sessionId}`);


            },
            () => {
                toast.error("Failed to submit.");
                setIsSubmitting(false);
                setIsLocked(false); // Unlock if it fails
            }
        );
    };

    const onToggleFlag = () => {
        if (isLocked) return;
        const newFlagged = new Set(flagged);
        if (newFlagged.has(currentQuestion.id)) newFlagged.delete(currentQuestion.id);
        else newFlagged.add(currentQuestion.id);
        setFlagged(newFlagged);
        telemetryToggleFlag(currentQuestion.id);
    };

    // ==========================================
    // GUARD CLAUSE
    // ==========================================
    if (!currentQuestion || paper.questions.length === 0)
    {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8">
                <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200 text-center space-y-4 max-w-md w-full">
                    <h2 className="text-2xl font-black text-slate-900">
                        {paper.questions.length === 0 ? "Empty Paper" : "You're all done!"}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {paper.questions.length === 0
                            ? "This question paper doesn't have any questions in it yet."
                            : "Review your flagged questions or submit the exam."}
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors mt-4"
                    >
                        {paper.questions.length === 0 ? "Go Back" : "Submit Exam"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-slate-50/50 p-1 pt-3 overflow-hidden">
            <DevMetricsOverlay
                sessionMode={mode}
                sessionId={sessionId}
                userId={userId}
                metrics={currentMetrics}
                recentActivities={recentActivities}
            />

            {durationInMinutes && (
                <div className="fixed top-4 right-6 z-50">
                    <SessionTimer durationSeconds={durationInMinutes * 60} />
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 h-full p-2">
                <ScrollArea className="flex-1 p-1">
                    <div className="max-w-4xl mx-auto flex flex-col justify-center min-h-[70vh]">
                        <Card className="rounded-[1.5rem] md:rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-4 py-3 md:px-8 md:py-4 flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <Badge variant="outline" className="rounded-md font-black text-[9px] md:text-[10px] bg-white px-2 py-0">
                                        Q {currentIndex + 1}
                                    </Badge>
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 truncate max-w-[120px] md:max-w-none">
                                        <Hash size={10} /> {currentQuestion.topic?.name || "Topic"}
                                    </span>
                                </div>
                                <Badge className={cn("font-black italic text-[9px] md:text-[10px] uppercase px-2 py-0",
                                    currentQuestion.difficulty === 'HARD' ? "bg-red-500" : "bg-slate-900")}>
                                    {currentQuestion.difficulty}
                                </Badge>
                            </CardHeader>

                            <CardContent className="p-5 md:p-7">
                                <h2 className="text-base md:text-lg font-black text-slate-900 leading-snug italic tracking-tight mb-6 md:mb-8">
                                    {currentQuestion.content}
                                </h2>

                                <div className="grid gap-2 md:gap-3">
                                    {(currentQuestion.type === "MCQ" || currentQuestion.type === "MSQ") && (
                                        <div className="grid gap-2 md:gap-3">
                                            {currentQuestion.options.map((option: any, i: number) => {
                                                const currentAnswers = answers[currentQuestion.id];
                                                const isSelected = currentQuestion.type === "MSQ"
                                                    ? Array.isArray(currentAnswers) && currentAnswers.includes(option.id)
                                                    : currentAnswers === option.id;
                                                const isCorrect = option.isCorrect;

                                                return (
                                                    <button
                                                        key={option.id}
                                                        disabled={isLocked}
                                                        onClick={() => !isLocked && onSelectOption(option.id, option.isCorrect)}
                                                        className={cn(
                                                            "group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 text-left",
                                                            isSelected ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-100 bg-white hover:border-slate-200",
                                                            mode === 'practice' && showAnswer && isCorrect && "border-green-500 bg-green-50 text-slate-900",
                                                            mode === 'practice' && showAnswer && isSelected && !isCorrect && "border-red-500 bg-red-50 text-slate-900",
                                                            isLocked && "pointer-events-none opacity-70" // 🔥 Locked style
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-7 h-7 md:w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 border-2 transition-colors",
                                                            isSelected ? "border-white/20 bg-white/10 text-white" : "border-slate-100 bg-slate-50 text-slate-400"
                                                        )}>
                                                            {currentQuestion.type === "MSQ"
                                                                ? (isSelected ? "✓" : String.fromCharCode(65 + i))
                                                                : String.fromCharCode(65 + i)
                                                            }
                                                        </div>
                                                        <span className="font-bold text-xs md:text-sm leading-tight">{option.text}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {currentQuestion.type === "NUMERICAL" && (
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                Enter your answer
                                            </label>
                                            <input
                                                type="number"
                                                disabled={isLocked}
                                                value={(answers[currentQuestion.id] as string) ?? ""}
                                                onChange={e => onNumericalChange(e.target.value)}
                                                placeholder="Type numerical answer..."
                                                className={cn(
                                                    "w-full h-14 px-5 text-lg font-bold rounded-2xl border-2 border-slate-200 bg-white outline-none focus:border-slate-900 transition-colors",
                                                    isLocked && "pointer-events-none opacity-70 bg-slate-50" // 🔥 Locked style
                                                )}
                                            />
                                            {mode === "practice" && showAnswer && (
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                                    <p className="text-sm font-bold text-green-700">
                                                        Correct Answer: {currentQuestion.correctAnswer}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {currentQuestion.type === "SUBJECTIVE" && (
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                Write your answer
                                            </label>
                                            <textarea
                                                disabled={isLocked}
                                                value={(answers[currentQuestion.id] as string) ?? ""}
                                                onChange={e => {
                                                    if (isLocked) return;
                                                    setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }));
                                                    handleAnswerSelection(currentQuestion.id, e.target.value, false, "SUBJECTIVE");
                                                }}
                                                placeholder="Write your answer here..."
                                                rows={6}
                                                className={cn(
                                                    "w-full px-5 py-4 text-sm font-medium rounded-2xl border-2 border-slate-200 bg-white outline-none focus:border-slate-900 transition-colors resize-none",
                                                    isLocked && "pointer-events-none opacity-70 bg-slate-50" // 🔥 Locked style
                                                )}
                                            />
                                            {mode === "practice" && showAnswer && currentQuestion.explanation && (
                                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Model Answer</p>
                                                    <p className="text-sm font-medium text-blue-800">{currentQuestion.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                <div className="h-14 md:h-16 bg-white border border-slate-200 rounded-2xl md:rounded-3xl mx-1 md:mx-4 mb-2 px-3 md:px-6 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex gap-1 md:gap-2">
                        <Button variant="ghost" size="sm" className="rounded-xl font-black italic text-[9px] md:text-[10px] px-2 h-9"
                            disabled={currentIndex === 0 || isLocked} onClick={() => onNavigate(currentIndex - 1)}>
                            <ChevronLeft className="mr-0.5 h-3 w-3" /> PREV
                        </Button>
                        <Button disabled={isLocked} variant="ghost" size="sm" className={cn("rounded-xl font-black italic text-[9px] md:text-[10px] px-2 h-9", flagged.has(currentQuestion.id) && "text-amber-500")} onClick={onToggleFlag}>
                            <Flag className={cn("mr-0.5 h-3 w-3", flagged.has(currentQuestion.id) && "fill-current")} /> FLAG
                        </Button>
                    </div>

                    <div className="flex gap-1 md:gap-2">
                        {mode === 'PRACTICE' && (
                            <Button disabled={isLocked} variant="secondary" size="sm" className="rounded-xl font-black italic text-[9px] md:text-[10px] bg-green-500 text-white hover:bg-green-600 h-9 px-3" onClick={() => setShowAnswer(true)}>
                                CHECK
                            </Button>
                        )}
                        {isLastQuestion ? (
                            <Button
                                size="sm"
                                className="rounded-xl font-black italic text-[9px] md:text-[10px] bg-green-600 text-white px-5 md:px-8 h-9"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isLocked}
                            >
                                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                disabled={isLocked}
                                className="rounded-xl font-black italic text-[9px] md:text-[10px] bg-slate-900 text-white px-5 md:px-8 h-9"
                                onClick={() => onNavigate(currentIndex + 1)}
                            >
                                NEXT <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <aside className="hidden xl:flex w-72 flex-col bg-white border border-slate-200 rounded-3xl m-4 ml-0 overflow-hidden shadow-sm shrink-0">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Navigation</h3>
                    <p className="text-[10px] font-bold text-slate-900">Jump to question</p>
                </div>

                <ScrollArea className="flex-1 p-2">
                    <div className="grid grid-cols-4 gap-2 p-3">
                        {paper.questions.map((q: any, i: number) => {
                            const isAnswered = !!answers[q.id];
                            const isFlagged = flagged.has(q.id);
                            const isCurrent = currentIndex === i;

                            return (
                                <button
                                    key={q.id}
                                    disabled={isLocked}
                                    onClick={() => onNavigate(i)}
                                    className={cn(
                                        "aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2 relative",
                                        isCurrent ? "border-slate-900 bg-white text-slate-900 shadow-md scale-110 z-10"
                                            : isAnswered ? "bg-slate-900 border-slate-900 text-white"
                                                : "bg-white border-slate-100 text-slate-300 hover:border-slate-200",
                                        isLocked && "pointer-events-none opacity-70"
                                    )}
                                >
                                    {isFlagged && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full border border-white" />}
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Completion</span>
                            <span className="text-xs font-black text-slate-900 italic">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1 bg-slate-200" />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLocked}
                        className="w-full h-10 rounded-xl bg-slate-900 font-bold"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Exam"}
                    </Button>
                </div>
            </aside>
        </div>
    );
}