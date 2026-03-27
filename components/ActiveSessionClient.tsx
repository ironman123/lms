"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Flag, Hash, Menu } from "lucide-react"; // Added Menu for mobile toggle if needed later
import { cn } from "@/lib/utils";

export default function ActiveSessionClient({ paper, mode }: any) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [showAnswer, setShowAnswer] = useState(false);

    const currentQuestion = paper.questions[currentIndex];
    const totalQuestions = paper.questions.length;
    const isLastQuestion = currentIndex === totalQuestions - 1;

    const progress = useMemo(() =>
        totalQuestions > 0 ? (Object.keys(answers).length / totalQuestions) * 100 : 0
        , [answers, totalQuestions]);

    const toggleFlag = () => {
        const newFlagged = new Set(flagged);
        if (newFlagged.has(currentQuestion.id)) newFlagged.delete(currentQuestion.id);
        else newFlagged.add(currentQuestion.id);
        setFlagged(newFlagged);
    };

    return (
        <div className="flex h-full w-full bg-slate-50/50 p-1 pt-3 overflow-hidden">

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 h-full p-2">
                <ScrollArea className="flex-1 p-1">
                    <div className="max-w-4xl mx-auto flex flex-col justify-center min-h-[70vh]">

                        {/* THE QUESTION CARD */}
                        <Card className="rounded-[1.5rem] md:rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-4 py-3 md:px-8 md:py-4 flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <Badge variant="outline" className="rounded-md font-black text-[9px] md:text-[10px] bg-white px-2 py-0">
                                        Q {currentIndex + 1}
                                    </Badge>
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 truncate max-w-[120px] md:max-w-none">
                                        <Hash size={10} /> {currentQuestion.topic.name}
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

                                {/* Options List - More Compact */}
                                <div className="grid gap-2 md:gap-3">
                                    {currentQuestion.options.map((option: any, i: number) => {
                                        const isSelected = answers[currentQuestion.id] === option.id;
                                        const isCorrect = option.isCorrect;

                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => { setAnswers({ ...answers, [currentQuestion.id]: option.id }); setShowAnswer(false); }}
                                                className={cn(
                                                    "group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 text-left",
                                                    isSelected
                                                        ? "border-slate-900 bg-slate-900 text-white shadow-md"
                                                        : "border-slate-100 bg-white hover:border-slate-200",
                                                    mode === 'practice' && showAnswer && isCorrect && "border-green-500 bg-green-50 text-slate-900",
                                                    mode === 'practice' && showAnswer && isSelected && !isCorrect && "border-red-500 bg-red-50 text-slate-900"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 border-2 transition-colors",
                                                    isSelected ? "border-white/20 bg-white/10 text-white" : "border-slate-100 bg-slate-50 text-slate-400"
                                                )}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className="font-bold text-xs md:text-sm leading-tight">{option.text}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </ScrollArea>

                {/* COMPACT BOTTOM NAV - Full width on mobile */}
                <div className="h-14 md:h-16 bg-white border border-slate-200 rounded-2xl md:rounded-3xl mx-1 md:mx-4 mb-2 px-3 md:px-6 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex gap-1 md:gap-2">
                        <Button variant="ghost" size="sm" className="rounded-xl font-black italic text-[9px] md:text-[10px] px-2 h-9"
                            disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>
                            <ChevronLeft className="mr-0.5 h-3 w-3" /> PREV
                        </Button>
                        <Button variant="ghost" size="sm" className={cn("rounded-xl font-black italic text-[9px] md:text-[10px] px-2 h-9", flagged.has(currentQuestion.id) && "text-amber-500")} onClick={toggleFlag}>
                            <Flag className={cn("mr-0.5 h-3 w-3", flagged.has(currentQuestion.id) && "fill-current")} /> FLAG
                        </Button>
                    </div>

                    <div className="flex gap-1 md:gap-2">
                        {mode === 'practice' && (
                            <Button variant="secondary" size="sm" className="rounded-xl font-black italic text-[9px] md:text-[10px] bg-green-500 text-white hover:bg-green-600 h-9 px-3" onClick={() => setShowAnswer(true)}>
                                CHECK
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className={cn("rounded-xl font-black italic text-[9px] md:text-[10px] bg-slate-900 text-white px-5 md:px-8 h-9 transition-opacity")}
                            disabled={isLastQuestion}
                            onClick={() => { setCurrentIndex(i => i + 1); setShowAnswer(false); }}
                        >
                            {isLastQuestion ? "FINAL" : "NEXT"} <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR: NAVIGATION MAP - Hidden on mobile, shown on large screens */}
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
                                    onClick={() => { setCurrentIndex(i); setShowAnswer(false); }}
                                    className={cn(
                                        "aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2 relative",
                                        isCurrent
                                            ? "border-slate-900 bg-white text-slate-900 shadow-md scale-110 z-10"
                                            : isAnswered
                                                ? "bg-slate-900 border-slate-900 text-white"
                                                : "bg-white border-slate-100 text-slate-300 hover:border-slate-200"
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
                    <Button className="w-full h-10 rounded-xl bg-slate-900 font-black italic uppercase tracking-widest text-[9px] shadow-lg transition-transform hover:scale-[1.02]">
                        Submit Exam
                    </Button>
                </div>
            </aside>
        </div>
    );
}