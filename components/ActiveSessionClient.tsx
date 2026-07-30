"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Flag, Hash, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMeaningfulAnswer } from "@/lib/exam-results";
import SessionTimer from "./SessionTimer";
import { toast } from "sonner";
import DevMetricsOverlay from "./DevMetricsOverlay";
import { useExamTelemetry } from "@/app/(main)/hooks/useExamTelemetry";
import { SessionMode } from "@prisma/client";
import { OptionJSON } from "@/types/question";
import type { RestoredInteraction } from "@/lib/session-interactions";
import type { ActiveSessionPaper } from "@/lib/session-loader";
import ReportIssueDialog from "@/components/ReportIssueDialog";

type SessionQuestion = ActiveSessionPaper["questions"][number];

export default function ActiveSessionClient({
    paper,
    mode,
    sessionId,
    userId,
    sessionExpiresAt,
    restoredInteractions,
    reportIdsByQuestion,
}: {
    paper: ActiveSessionPaper;
    mode: SessionMode;
    sessionId: string;
    userId: string;
    sessionExpiresAt: string | null;
    restoredInteractions: RestoredInteraction[];
    reportIdsByQuestion: Record<string, string>;
}) {
    // ── UI State ──────────────────────────────────────────────────────────────
    const restoredAnswers = useMemo(() => {
        const questionTypes = new Map(
            paper.questions.map((question) => [
                question.id,
                question.type,
            ])
        );

        return Object.fromEntries(
            restoredInteractions
                .filter((interaction) => interaction.selectedAnswer?.trim())
                .map((interaction) => [
                    interaction.questionId,
                    questionTypes.get(interaction.questionId) === "MSQ"
                        ? interaction.selectedAnswer!.split(",").filter(Boolean)
                        : interaction.selectedAnswer!,
                ])
        ) as Record<string, string | string[]>;
    }, [paper.questions, restoredInteractions]);
    const restoredQuestionIndex = Math.max(
        0,
        paper.questions.findIndex(
            (question) => !(question.id in restoredAnswers)
        )
    );

    const [currentIndex, setCurrentIndex] = useState(restoredQuestionIndex);
    const [showAnswer, setShowAnswer] = useState(false);
    // MCQ  → answers[qId] = "2"          (stringified index)
    // MSQ  → answers[qId] = ["0","2"]    (array of stringified indices)
    // NUMERICAL/SUBJECTIVE → answers[qId] = raw string value
    const [answers, setAnswers] =
        useState<Record<string, string | string[]>>(restoredAnswers);
    const [flagged, setFlagged] = useState<Set<string>>(
        () =>
            new Set(
                restoredInteractions
                    .filter((interaction) => interaction.isFlagged)
                    .map((interaction) => interaction.questionId)
            )
    );
    const [isLocked, setIsLocked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const numericalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const submissionStartedRef = useRef(false);

    const currentQuestion = paper.questions[currentIndex];
    const totalQuestions: number = paper.questions.length;
    const isLastQuestion = currentIndex === totalQuestions - 1;

    const progress = useMemo(
        () =>
            totalQuestions > 0
                ? (
                    Object.values(answers).filter(hasMeaningfulAnswer).length /
                    totalQuestions
                ) * 100
                : 0,
        [answers, totalQuestions]
    );

    // ── Telemetry ─────────────────────────────────────────────────────────────
    const {
        currentMetrics,
        recentActivities,
        offlineRecovery,
        handleNavigation,
        handleAnswerSelection,
        syncAnswers,
        flushAndSubmit,
        toggleFlag: telemetryToggleFlag,
    } = useExamTelemetry(
        sessionId,
        currentQuestion?.id ?? "",
        restoredInteractions
    );

    useEffect(() => {
        syncAnswers(answers);
    }, [answers, syncAnswers]);

    useEffect(() => {
        if (restoredInteractions.length > 0) {
            toast.success("Your saved session progress was restored.");
        }
    }, [restoredInteractions.length]);

    useEffect(() => {
        if (!offlineRecovery) return;
        const timeout = window.setTimeout(() => {
            const questionTypes = new Map(
                paper.questions.map((question) => [question.id, question.type])
            );
            const recoveredAnswers = Object.fromEntries(
                offlineRecovery
                    .filter((metric) => metric.selectedAnswer?.trim())
                    .map((metric) => [
                        metric.questionId,
                        questionTypes.get(metric.questionId) === "MSQ"
                            ? metric.selectedAnswer!.split(",").filter(Boolean)
                            : metric.selectedAnswer!,
                    ])
            ) as Record<string, string | string[]>;
            setAnswers((previous) => ({ ...previous, ...recoveredAnswers }));
            setFlagged((previous) => {
                const next = new Set(previous);
                for (const metric of offlineRecovery) {
                    if (metric.isFlagged) next.add(metric.questionId);
                    else next.delete(metric.questionId);
                }
                return next;
            });
            toast.success("Recovered newer answers saved on this browser.");
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [offlineRecovery, paper.questions]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Last segment of a "Physics > Mechanics > Newton's Laws" path. */
    function topicLabel(q: SessionQuestion): string {
        if (!q.topicPath) return "General";
        const parts = q.topicPath.split(">");
        return parts[parts.length - 1].trim();
    }

    /** Human-readable correct answer for NUMERICAL practice reveal. */
    function numericalCorrectLabel(q: SessionQuestion): string {
        if (q.exactAnswer != null) return String(q.exactAnswer);
        if (q.answerMin != null && q.answerMax != null)
            return `${q.answerMin} – ${q.answerMax}`;
        return "—";
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    const onNavigate = (newIndex: number) => {
        if (isLocked) return;
        setCurrentIndex(newIndex);
        setShowAnswer(false);
        handleNavigation(paper.questions[newIndex].id);
    };

    // ── MCQ / MSQ selection ───────────────────────────────────────────────────
    // Answers are stored as stringified option indices to match what
    // completeExamSession expects: parseInt("2") for MCQ, "0,2".split(",") for MSQ.
    const onSelectOption = (optionIndex: number) => {
        if (isLocked) return;
        const qId = currentQuestion.id;
        const indexStr = String(optionIndex);

        if (currentQuestion.type === "MSQ") {
            setAnswers((prev) => {
                const current = (prev[qId] as string[]) ?? [];
                const updated = current.includes(indexStr)
                    ? current.filter((v) => v !== indexStr)
                    : [...current, indexStr];

                // isCorrect for MSQ is too complex to derive per-toggle — server owns truth
                handleAnswerSelection(qId, updated.join(","), false, "MSQ");
                return { ...prev, [qId]: updated };
            });
        } else {
            // MCQ — single index string
            const isCorrect =
                mode === SessionMode.PRACTICE
                    ? currentQuestion.correctOptions?.[0] === optionIndex
                    : false; // mock: never reveal on client

            setAnswers((prev) => ({ ...prev, [qId]: indexStr }));
            handleAnswerSelection(qId, indexStr, isCorrect, "MCQ");
        }
    };

    // ── NUMERICAL ─────────────────────────────────────────────────────────────
    const onNumericalChange = (value: string) => {
        if (isLocked) return;
        const qId = currentQuestion.id;
        setAnswers((prev) => ({ ...prev, [qId]: value }));

        if (numericalTimeoutRef.current) clearTimeout(numericalTimeoutRef.current);
        numericalTimeoutRef.current = setTimeout(() => {
            if (value.trim())
                handleAnswerSelection(qId, value, false, "NUMERICAL");
        }, 1500);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const submitSession = async (skipUnansweredConfirmation = false) => {
        if (submissionStartedRef.current) return;
        const unanswered =
            totalQuestions -
            Object.values(answers).filter(hasMeaningfulAnswer).length;
        if (
            !skipUnansweredConfirmation &&
            unanswered > 0 &&
            !confirm(`${unanswered} unanswered. Submit anyway?`)
        ) return;

        submissionStartedRef.current = true;
        setIsSubmitting(true);
        setIsLocked(true);

        await flushAndSubmit(
            answers,
            () => window.location.replace(`/results/${sessionId}`),
            () => {
                submissionStartedRef.current = false;
                toast.error("Failed to submit. Please try again.");
                setIsSubmitting(false);
                setIsLocked(false);
            }
        );
    };
    const handleSubmit = () => void submitSession(false);

    // ── Flag ──────────────────────────────────────────────────────────────────
    const onToggleFlag = () => {
        if (isLocked) return;
        setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) {
                next.delete(currentQuestion.id);
            } else {
                next.add(currentQuestion.id);
            }
            return next;
        });
        telemetryToggleFlag(currentQuestion.id);
    };

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (!currentQuestion || totalQuestions === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8">
                <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
                    <h2 className="text-2xl font-black text-foreground">Empty Paper</h2>
                    <p className="text-sm text-muted-foreground">
                        This question paper doesn&apos;t have any questions yet.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-4 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const options = (currentQuestion.options ?? []) as OptionJSON[];
    const correctOptions: number[] = currentQuestion.correctOptions ?? [];

    return (
        <div className="flex h-full w-full overflow-hidden bg-background p-1 pt-3">
            <DevMetricsOverlay
                sessionMode={mode}
                sessionId={sessionId}
                userId={userId}
                metrics={currentMetrics}
                recentActivities={recentActivities}
            />

            {mode === SessionMode.MOCK && sessionExpiresAt && (
                <div className="fixed right-4 top-3 z-50 md:right-6">
                    <SessionTimer
                        expiresAt={sessionExpiresAt}
                        onExpire={() => void submitSession(true)}
                    />
                </div>
            )}

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-full p-2">
                <ScrollArea className="flex-1 p-1">
                    <div className="max-w-4xl mx-auto flex flex-col justify-center min-h-[70vh]">
                        <Card className="overflow-hidden rounded-[1.5rem] border-border bg-card shadow-sm md:rounded-[2rem]">
                            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border bg-muted/25 px-4 py-3 md:px-8 md:py-4">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <Badge
                                        variant="outline"
                                        className="rounded-md border-border bg-background px-2 py-0 text-[9px] font-black md:text-[10px]"
                                    >
                                        Q {currentIndex + 1}
                                    </Badge>
                                    <span className="flex max-w-[120px] items-center gap-1 truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground md:max-w-none md:text-[10px]">
                                        <Hash size={10} />
                                        {topicLabel(currentQuestion)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ReportIssueDialog
                                        key={currentQuestion.id}
                                        compact
                                        target={{
                                            targetType: "QUESTION",
                                            questionId: currentQuestion.id,
                                            sessionId,
                                            source: "ACTIVE_SESSION",
                                        }}
                                        existingReportId={
                                            reportIdsByQuestion[
                                                currentQuestion.id
                                            ] ?? null
                                        }
                                    />
                                    <Badge
                                        className={cn(
                                            "px-2 py-0 text-[9px] font-black uppercase md:text-[10px]",
                                            currentQuestion.difficulty === "HARD"
                                                ? "bg-destructive text-white"
                                                : "bg-secondary text-secondary-foreground"
                                        )}
                                    >
                                        {currentQuestion.difficulty}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 md:p-7">
                                <h2 className="mb-6 text-base font-bold leading-snug tracking-tight text-foreground md:mb-8 md:text-lg">
                                    {currentQuestion.content}
                                </h2>

                                {/* ── MCQ / MSQ ──────────────────────────────────── */}
                                {(currentQuestion.type === "MCQ" ||
                                    currentQuestion.type === "MSQ") && (
                                        <div className="grid gap-2 md:gap-3">
                                            {options.map((option, i) => {
                                                const currentAnswers = answers[currentQuestion.id];
                                                const indexStr = String(option.index);

                                                const isSelected =
                                                    currentQuestion.type === "MSQ"
                                                        ? Array.isArray(currentAnswers) &&
                                                        currentAnswers.includes(indexStr)
                                                        : currentAnswers === indexStr;

                                                // Only non-empty in PRACTICE mode — mock page strips correctOptions
                                                const isCorrectOption = correctOptions.includes(option.index);

                                                return (
                                                    <button
                                                        key={option.index}
                                                        disabled={isLocked}
                                                        onClick={() => onSelectOption(option.index)}
                                                        className={cn(
                                                            "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 md:gap-4 md:rounded-2xl md:p-4",
                                                            isSelected
                                                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                                : "border-border bg-background hover:border-primary/50 hover:bg-accent/40",
                                                            // Practice-only reveals
                                                            mode === SessionMode.PRACTICE &&
                                                            showAnswer &&
                                                            isCorrectOption &&
                                                            "border-success/50 bg-success/10 text-foreground",
                                                            mode === SessionMode.PRACTICE &&
                                                            showAnswer &&
                                                            isSelected &&
                                                            !isCorrectOption &&
                                                            "border-destructive/60 bg-destructive/10 text-foreground",
                                                            isLocked && "pointer-events-none opacity-70"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black transition-colors md:h-8 md:w-8 md:text-xs",
                                                                isSelected
                                                                    ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                                                                    : "border-border bg-muted text-muted-foreground"
                                                            )}
                                                        >
                                                            {currentQuestion.type === "MSQ"
                                                                ? isSelected
                                                                    ? "✓"
                                                                    : String.fromCharCode(65 + i)
                                                                : String.fromCharCode(65 + i)}
                                                        </div>
                                                        <span className="font-bold text-xs md:text-sm leading-tight">
                                                            {option.text}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                {/* ── NUMERICAL ──────────────────────────────────── */}
                                {currentQuestion.type === "NUMERICAL" && (
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                            Enter your answer
                                        </label>
                                        <input
                                            type="number"
                                            disabled={isLocked}
                                            value={(answers[currentQuestion.id] as string) ?? ""}
                                            onChange={(e) => onNumericalChange(e.target.value)}
                                            placeholder="Type numerical answer..."
                                            className={cn(
                                                "h-14 w-full rounded-2xl border border-input bg-background px-5 text-lg font-bold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15",
                                                isLocked && "pointer-events-none bg-muted opacity-70"
                                            )}
                                        />
                                        {mode === SessionMode.PRACTICE && showAnswer && (
                                            <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                                                <p className="text-sm font-bold text-success">
                                                    Correct Answer: {numericalCorrectLabel(currentQuestion)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── SUBJECTIVE ─────────────────────────────────── */}
                                {currentQuestion.type === "SUBJECTIVE" && (
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                            Write your answer
                                        </label>
                                        <textarea
                                            disabled={isLocked}
                                            value={(answers[currentQuestion.id] as string) ?? ""}
                                            onChange={(e) => {
                                                if (isLocked) return;
                                                const val = e.target.value;
                                                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
                                                handleAnswerSelection(currentQuestion.id, val, false, "SUBJECTIVE");
                                            }}
                                            placeholder="Write your answer here..."
                                            rows={6}
                                            className={cn(
                                                "w-full resize-none rounded-2xl border border-input bg-background px-5 py-4 text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15",
                                                isLocked && "pointer-events-none bg-muted opacity-70"
                                            )}
                                        />
                                        {mode === SessionMode.PRACTICE &&
                                            showAnswer &&
                                            currentQuestion.modelAnswer && (
                                                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                                                    <p className="mb-1 text-xs font-black uppercase tracking-widest text-primary">
                                                        Model Answer
                                                    </p>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {currentQuestion.modelAnswer}
                                                    </p>
                                                </div>
                                            )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                {/* ── Bottom toolbar ────────────────────────────────────────── */}
                <div className="mx-1 mb-2 grid shrink-0 grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm md:mx-4 md:flex md:h-16 md:items-center md:justify-between md:rounded-3xl md:px-6 md:py-0">
                    <div className="contents md:flex md:gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 min-w-0 rounded-xl px-2 text-[9px] font-black md:h-9 md:text-[10px]"
                            disabled={currentIndex === 0 || isLocked}
                            onClick={() => onNavigate(currentIndex - 1)}
                        >
                            <ChevronLeft className="mr-0.5 h-3 w-3" /> PREV
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLocked}
                            className={cn(
                                "h-10 min-w-0 rounded-xl px-2 text-[9px] font-black md:h-9 md:text-[10px]",
                                flagged.has(currentQuestion.id) &&
                                    "bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning"
                            )}
                            onClick={onToggleFlag}
                        >
                            <Flag
                                className={cn(
                                    "mr-0.5 h-3 w-3",
                                    flagged.has(currentQuestion.id) && "fill-current"
                                )}
                            />
                            FLAG
                        </Button>

                        {/* Mobile-only: open question navigator sheet */}
                        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 min-w-0 rounded-xl px-2 text-[9px] font-black md:h-9 md:text-[10px] xl:hidden"
                                    disabled={isLocked}
                                >
                                    <LayoutGrid className="mr-0.5 h-3 w-3" />
                                    QUESTIONS
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl p-0 flex flex-col">
                                <SheetHeader className="shrink-0 border-b border-border bg-muted/25 px-6 pb-4 pt-5">
                                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Navigation</p>
                                    <SheetTitle className="text-sm font-bold leading-none text-foreground">
                                        Jump to question
                                    </SheetTitle>
                                </SheetHeader>

                                <ScrollArea className="flex-1">
                                    <div className="grid grid-cols-6 gap-2 p-4">
                                        {paper.questions.map((q, i) => {
                                            const isAnswered = hasMeaningfulAnswer(
                                                answers[q.id]
                                            );
                                            const isFlagged = flagged.has(q.id);
                                            const isCurrent = currentIndex === i;

                                            return (
                                                <button
                                                    key={q.id}
                                                    disabled={isLocked}
                                                    onClick={() => {
                                                        onNavigate(i);
                                                        setMobileNavOpen(false);
                                                    }}
                                                    className={cn(
                                                        "relative flex aspect-square items-center justify-center rounded-lg border text-[11px] font-black transition-all",
                                                        isCurrent
                                                            ? isFlagged
                                                                ? "z-10 border-warning bg-warning/15 text-warning shadow-sm"
                                                                : "z-10 border-primary bg-primary/10 text-primary shadow-sm"
                                                            : isAnswered
                                                                ? isFlagged
                                                                    ? "border-warning bg-foreground text-background ring-1 ring-warning"
                                                                    : "border-foreground bg-foreground text-background"
                                                                : isFlagged
                                                                    ? "border-warning bg-warning/10 text-warning"
                                                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent",
                                                        isFlagged &&
                                                            "ring-2 ring-warning/60 ring-offset-2 ring-offset-card",
                                                        isLocked && "pointer-events-none opacity-70"
                                                    )}
                                                >
                                                    {isFlagged && (
                                                        <Flag className="absolute right-1 top-1 h-2.5 w-2.5 fill-warning text-warning" />
                                                    )}
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>

                                <div className="shrink-0 space-y-4 border-t border-border bg-muted/25 px-5 pb-6 pt-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                                                Completion
                                            </span>
                                            <span className="text-xs font-black text-foreground">
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                        <Progress value={progress} className="h-1 bg-muted" />
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setMobileNavOpen(false);
                                            handleSubmit();
                                        }}
                                        disabled={isSubmitting || isLocked}
                                        className="h-11 w-full rounded-xl font-bold"
                                    >
                                        {isSubmitting ? "Submitting..." : "Submit Exam"}
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="col-span-3 grid grid-cols-2 gap-2 md:flex">
                        {mode === SessionMode.PRACTICE && (
                            <Button
                                disabled={isLocked || showAnswer}
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-10 rounded-xl border-primary/30 bg-primary/5 px-3 text-[9px] font-black text-foreground hover:bg-primary/10 hover:text-foreground md:h-9 md:text-[10px]",
                                    showAnswer &&
                                        "border-success/40 bg-success/10 text-success opacity-100"
                                )}
                                onClick={() => setShowAnswer(true)}
                            >
                                {showAnswer ? "ANSWER SHOWN" : "CHECK ANSWER"}
                            </Button>
                        )}
                        {isLastQuestion ? (
                            <Button
                                size="sm"
                                className="h-10 rounded-xl px-5 text-[9px] font-black md:h-9 md:px-8 md:text-[10px]"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isLocked}
                            >
                                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                disabled={isLocked}
                                className={cn(
                                    "h-10 rounded-xl px-5 text-[9px] font-black md:h-9 md:px-8 md:text-[10px]",
                                    mode !== SessionMode.PRACTICE &&
                                        "col-span-2 md:col-span-1"
                                )}
                                onClick={() => onNavigate(currentIndex + 1)}
                            >
                                NEXT <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Question navigator sidebar ────────────────────────────────── */}
            <aside className="m-4 ml-0 hidden w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm xl:flex">
                <div className="border-b border-border bg-muted/25 p-6">
                    <h3 className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                        Navigation
                    </h3>
                    <p className="text-[10px] font-bold text-foreground">Jump to question</p>
                </div>

                <ScrollArea className="flex-1 p-2">
                    <div className="grid grid-cols-4 gap-2 p-3">
                        {paper.questions.map((q, i) => {
                            const isAnswered = hasMeaningfulAnswer(answers[q.id]);
                            const isFlagged = flagged.has(q.id);
                            const isCurrent = currentIndex === i;

                            return (
                                <button
                                    key={q.id}
                                    disabled={isLocked}
                                    onClick={() => onNavigate(i)}
                                    className={cn(
                                        "relative flex aspect-square items-center justify-center rounded-xl border text-[10px] font-black transition-all",
                                        isCurrent
                                            ? isFlagged
                                                ? "z-10 border-warning bg-warning/15 text-warning shadow-sm"
                                                : "z-10 border-primary bg-primary/10 text-primary shadow-sm"
                                            : isAnswered
                                                ? isFlagged
                                                    ? "border-warning bg-foreground text-background"
                                                    : "border-foreground bg-foreground text-background"
                                                : isFlagged
                                                    ? "border-warning bg-warning/10 text-warning"
                                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent",
                                        isFlagged &&
                                            "ring-2 ring-warning/60 ring-offset-2 ring-offset-card",
                                        isLocked && "pointer-events-none opacity-70"
                                    )}
                                >
                                    {isFlagged && (
                                        <Flag className="absolute right-1 top-1 h-2.5 w-2.5 fill-warning text-warning" />
                                    )}
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="space-y-4 border-t border-border bg-muted/25 p-6">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                                Completion
                            </span>
                            <span className="text-xs font-black text-foreground">
                                {Math.round(progress)}%
                            </span>
                        </div>
                        <Progress value={progress} className="h-1 bg-muted" />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLocked}
                        className="h-10 w-full rounded-xl font-bold"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Exam"}
                    </Button>
                </div>
            </aside>
        </div>
    );
}
