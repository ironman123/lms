"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Bookmark, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveSessionProps {
    paper: any; // Use proper types from Prisma
    mode: 'practice' | 'mock';
}

export default function ActiveSessionClient({ paper, mode }: ActiveSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({}); // { questionId: optionId }
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [showAnswer, setShowAnswer] = useState(false);

    const currentQuestion = paper.questions[currentIndex];
    const totalQuestions = paper.questions.length;

    // --- LOGIC ---
    const handleOptionSelect = (optionId: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
        setShowAnswer(false); // Reset feedback when switching options in practice
    };

    const toggleFlag = () => {
        const newFlagged = new Set(flagged);
        if (newFlagged.has(currentQuestion.id)) newFlagged.delete(currentQuestion.id);
        else newFlagged.add(currentQuestion.id);
        setFlagged(newFlagged);
    };

    return (
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] overflow-hidden bg-white">

            {/* LEFT: QUESTION WORKSPACE */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12 border-r border-slate-100">
                <div className="max-w-3xl mx-auto h-full flex flex-col">

                    {/* Header Info */}
                    <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Question {currentIndex + 1} of {totalQuestions}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-md uppercase text-slate-500">
                                {currentQuestion.topic.name}
                            </span>
                            <span className={cn(
                                "text-[10px] font-black px-2 py-1 rounded-md uppercase",
                                currentQuestion.difficulty === 'HARD' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                            )}>
                                {currentQuestion.difficulty}
                            </span>
                        </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight mb-8">
                            {currentQuestion.content}
                        </h2>

                        {/* Options Grid */}
                        <div className="grid gap-3">
                            {currentQuestion.options.map((option: any, i: number) => {
                                const isSelected = answers[currentQuestion.id] === option.id;
                                const isCorrect = option.isCorrect;

                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        className={cn(
                                            "flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all",
                                            isSelected ? "border-slate-900 bg-slate-50 scale-[1.01]" : "border-slate-100 hover:border-slate-200",
                                            mode === 'practice' && showAnswer && isCorrect && "border-green-500 bg-green-50",
                                            mode === 'practice' && showAnswer && isSelected && !isCorrect && "border-red-500 bg-red-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                                            isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="font-bold text-slate-700">{option.text}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-xl font-bold"
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex(i => i - 1)}
                            >
                                <ChevronLeft className="mr-2" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-xl font-bold"
                                onClick={toggleFlag}
                            >
                                <Bookmark className={cn("mr-2", flagged.has(currentQuestion.id) && "fill-amber-500 text-amber-500")} />
                                {flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            {mode === 'practice' && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    className="rounded-xl font-bold bg-green-100 text-green-700 hover:bg-green-200"
                                    onClick={() => setShowAnswer(true)}
                                >
                                    Check Answer
                                </Button>
                            )}
                            <Button
                                size="lg"
                                className="rounded-xl font-bold bg-slate-900"
                                disabled={currentIndex === totalQuestions - 1}
                                onClick={() => { setCurrentIndex(i => i + 1); setShowAnswer(false); }}
                            >
                                Next <ChevronRight className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* RIGHT: BUBBLE SHEET / NAVIGATION GRID */}
            {/* RIGHT: BUBBLE SHEET */}
            <aside className="hidden lg:flex w-80 flex-col bg-slate-50 border-l border-slate-100 h-full">
                <div className="p-6 pb-4 border-b border-slate-200 bg-white">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Navigation Grid
                    </h3>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="grid grid-cols-4 gap-3"> {/* Changed to 4 cols for better spacing */}
                        {paper.questions.map((q: any, i: number) => {
                            const isAnswered = !!answers[q.id];
                            const isFlagged = flagged.has(q.id);
                            const isCurrent = currentIndex === i;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => { setCurrentIndex(i); setShowAnswer(false); }}
                                    className={cn(
                                        "aspect-square w-full rounded-xl flex items-center justify-center text-xs font-black transition-all border-2",
                                        isCurrent
                                            ? "border-slate-900 bg-white text-slate-900 shadow-md ring-2 ring-slate-900/10"
                                            : "border-transparent",
                                        isAnswered && !isCurrent
                                            ? "bg-slate-900 text-white"
                                            : "bg-white text-slate-400 border-slate-200",
                                        isFlagged && !isAnswered
                                            ? "bg-amber-100 text-amber-600 border-amber-200"
                                            : "",
                                        isFlagged && isAnswered
                                            ? "ring-2 ring-amber-400"
                                            : ""
                                    )}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Completion Stats Summary */}
                <div className="p-6 bg-white border-t border-slate-200 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progress</span>
                        <span>{Math.round((Object.keys(answers).length / totalQuestions) * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-slate-900 transition-all duration-500"
                            style={{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }}
                        />
                    </div>
                    <Button className="w-full h-12 rounded-xl bg-slate-900 font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                        Submit Paper
                    </Button>
                </div>
            </aside>
        </div>
    );
}