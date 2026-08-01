//lobby/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import StartExamButton from "@/components/StartExamButton";
import ReportIssueDialog from "@/components/ReportIssueDialog";
import { Timer, ClipboardCheck, AlertCircle, BookOpen, Layers, Trophy } from "lucide-react";
import { SessionMode, SessionStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { RESUMABLE_SESSION_STATUSES } from "@/lib/session-policy";
import {
    getPaperReadiness,
    paperReadinessMessage,
} from "@/lib/paper-readiness";

export default async function PaperLobbyPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionUnavailable?: string; examId?: string }>;
}) {
    const { paperId } = await params;
    const { sessionUnavailable, examId: requestedExamId } = await searchParams;

    const [user, paper] = await Promise.all([
        requireAuth(),
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                examQuestionPaperLinks: {
                    include: {
                        exam: true
                    }
                },
                questions: {
                    where: { isArchived: false },
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        difficulty: true,
                        marks: true,
                        negativeMarks: true,
                        explanation: true,
                        isCancelled: true,
                        topicPath: true,
                        options: true,
                        correctOptions: true,
                        exactAnswer: true,
                        answerMin: true,
                        answerMax: true,
                        modelAnswer: true,
                        topic: {
                            select: {
                                category: { select: { name: true } }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        questions: { where: { isArchived: false } },
                    },
                },
            }
        }),
    ]);

    if (!paper) notFound();
    const existingPaperReport = await prisma.contentReport.findFirst({
        where: {
            reporterId: user.id,
            withdrawnAt: null,
            moderationCase: {
                paperId,
                paperRevision: paper.contentRevision,
            },
        },
        select: { id: true },
    });
    const now = new Date();

    await prisma.testSession.updateMany({
        where: {
            userId: user.id,
            paperId,
            status: { in: [...RESUMABLE_SESSION_STATUSES] },
            expiresAt: { lte: now },
        },
        data: { status: SessionStatus.EXPIRED },
    });

    const resumableSessions = await prisma.testSession.findMany({
        where: {
            userId: user.id,
            paperId,
            status: { in: [...RESUMABLE_SESSION_STATUSES] },
            expiresAt: { gt: now },
        },
        select: { id: true, mode: true },
    });
    const resumeByMode = new Map(
        resumableSessions.map((session) => [session.mode, session.id])
    );
    const linkedExams = paper.examQuestionPaperLinks.map((link) => link.exam);
    const requestedExam = requestedExamId
        ? linkedExams.find((exam) => exam.id === requestedExamId)
        : undefined;
    const currentExam = requestedExamId
        ? requestedExam
        : linkedExams.length === 1
            ? linkedExams[0]
            : undefined;
    const selectedExamId = currentExam?.id ?? null;
    const requiresExamSelection =
        linkedExams.length > 1 && !selectedExamId;
    const invalidExamContext = Boolean(requestedExamId && !requestedExam);

    const examDuration = currentExam?.duration ?? 60;

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
    const readiness = getPaperReadiness(paper.questions);
    const readinessMessage = paper.isArchived
        ? "This paper has been archived and cannot start new sessions."
        : paperReadinessMessage(readiness);
    const launchDisabledReason = invalidExamContext
        ? "That exam is not linked to this paper."
        : requiresExamSelection
            ? "Choose which exam this attempt should count toward."
            : readinessMessage;

    return (
        <div className="min-h-full w-full bg-background py-6 md:py-12">
            <div className="mx-auto max-w-4xl px-4">
                {sessionUnavailable === "1" && (
                    <div
                        role="status"
                        className="mb-4 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-foreground"
                    >
                        <AlertCircle
                            className="shrink-0 text-warning"
                            size={18}
                            aria-hidden="true"
                        />
                        That attempt expired or is no longer available. You can
                        start a new session below.
                    </div>
                )}
                {readinessMessage && resumeByMode.size === 0 && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-foreground"
                    >
                        <AlertCircle
                            className="mt-0.5 shrink-0 text-destructive"
                            size={18}
                            aria-hidden="true"
                        />
                        <div>
                            <p className="font-bold">Paper unavailable</p>
                            <p className="mt-1 text-muted-foreground">
                                {readinessMessage}
                            </p>
                        </div>
                    </div>
                )}
                <Card className="rounded-[2.5rem] border-border shadow-2xl p-8 md:p-12 bg-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-background rounded-full -mr-32 -mt-32 z-0" />

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Entrance Lobby</span>
                            <h1 className="text-3xl md:text-4xl font-black text-foreground mt-2 italic">
                                {paper.title} <span className="text-muted-foreground font-light not-italic">Workspace</span>
                            </h1>
                        </div>

                        {/* Top Stats - Now 3 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                            <div className="bg-background p-4 rounded-3xl border border-border/60 flex items-center gap-4">
                                <div className="p-3 bg-card rounded-2xl shadow-sm text-blue-600"><Timer size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Time</p>
                                    <p className="font-black text-foreground">{examDuration}min</p>
                                </div>
                            </div>
                            <div className="bg-background p-4 rounded-3xl border border-border/60 flex items-center gap-4">
                                <div className="p-3 bg-card rounded-2xl shadow-sm text-green-600"><ClipboardCheck size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Questions</p>
                                    <p className="font-black text-foreground">{paper._count.questions} Qs</p>
                                </div>
                            </div>
                            <div className="bg-background p-4 rounded-3xl border border-border/60 flex items-center gap-4">
                                <div className="p-3 bg-card rounded-2xl shadow-sm text-amber-500"><Trophy size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Maximum</p>
                                    <p className="font-black text-foreground">{totalMarks} Marks</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mb-10">
                            {/* Subject Breakdown */}
                            <div>
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <BookOpen size={14} /> Subject Breakdown
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(categoryDistribution).map(([name, count]) => (
                                        <div key={name} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-xl shadow-sm transition-hover hover:border-slate-300">
                                            <span className="text-xs font-bold text-foreground/80">{name}</span>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-muted rounded-md text-muted-foreground">{count} Qs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Format details */}
                            <div>
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
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
                                        <div className="flex items-center justify-between p-3 bg-background border border-border/60 rounded-xl">
                                            <span className="text-xs font-bold text-foreground/80">Multiple Select</span>
                                            <span className="text-[10px] font-black text-muted-foreground">{typeStats.msq} Items</span>
                                        </div>
                                    )}
                                    {typeStats.sub > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-lg">
                                            <span className="text-xs font-bold">Subjective</span>
                                            <span className="text-[10px] font-black opacity-70">{typeStats.sub} Items</span>
                                        </div>
                                    )}
                                    {typeStats.numerical > 0 && (
                                        <div className="flex items-center justify-between p-3 bg-background border border-border/60 rounded-xl">
                                            <span className="text-xs font-bold text-foreground/80">Numerical Entry</span>
                                            <span className="text-[10px] font-black text-muted-foreground">{typeStats.numerical} Items</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {(linkedExams.length > 1 || invalidExamContext) && (
                            <section className="mb-10 rounded-3xl border border-border bg-background p-5">
                                <div className="mb-4">
                                    <h2 className="text-sm font-black text-foreground">
                                        {linkedExams.length > 1
                                            ? "Choose exam context"
                                            : "Invalid exam context"}
                                    </h2>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        This paper belongs to more than one exam. Your score will count only toward the exam selected here.
                                    </p>
                                    {invalidExamContext && (
                                        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                                            The requested exam is not linked to this paper. Choose a valid exam below.
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {linkedExams.map((exam) => {
                                        const selected = exam.id === selectedExamId;
                                        return (
                                            <Link
                                                key={exam.id}
                                                href={`/exam/${paperId}/lobby?examId=${encodeURIComponent(exam.id)}`}
                                                aria-current={selected ? "true" : undefined}
                                                className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                                            >
                                                {exam.name}
                                            </Link>
                                        );
                                    })}
                                    {linkedExams.length === 0 && (
                                        <Link
                                            href={`/exam/${paperId}/lobby`}
                                            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-accent"
                                        >
                                            Continue as standalone paper
                                        </Link>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Instructions */}
                        <div className="mb-10 rounded-[2rem] border border-warning/30 bg-warning/10 p-6">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground">
                                <AlertCircle size={16} /> Exam Protocol
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-xs font-medium leading-relaxed text-muted-foreground">
                                    <span className="font-black underline block mb-1">Mock Exam Mode</span>
                                    Full simulation. Timer will be active. Answers and explanations will be locked until the test is submitted.
                                </div>
                                <div className="text-xs font-medium leading-relaxed text-muted-foreground">
                                    <span className="font-black underline block mb-1">Practice Mode</span>
                                    Learning focused. No timer pressure. You can view correct answers and detailed explanations after every question.
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <StartExamButton
                                paperId={paperId}
                                mode={SessionMode.PRACTICE}
                                label={
                                    resumeByMode.has(SessionMode.PRACTICE)
                                        ? "Resume Practice"
                                        : "Practice"
                                }
                                variant="outline"
                                resumeSessionId={resumeByMode.get(
                                    SessionMode.PRACTICE
                                )}
                                disabledReason={
                                    resumeByMode.has(SessionMode.PRACTICE)
                                        ? null
                                        : launchDisabledReason
                                }
                                examId={selectedExamId}
                            />
                            <StartExamButton
                                paperId={paperId}
                                mode={SessionMode.MOCK}
                                label={
                                    resumeByMode.has(SessionMode.MOCK)
                                        ? "Resume Mock"
                                        : "Start Exam"
                                }
                                variant="default"
                                resumeSessionId={resumeByMode.get(
                                    SessionMode.MOCK
                                )}
                                disabledReason={
                                    resumeByMode.has(SessionMode.MOCK)
                                        ? null
                                        : launchDisabledReason
                                }
                                examId={selectedExamId}
                            />
                        </div>
                        {!paper.isArchived && (
                        <div className="mt-5 flex justify-center">
                            <ReportIssueDialog
                                target={{
                                    targetType: "PAPER",
                                    paperId,
                                    source: "PAPER_PAGE",
                                }}
                                existingReportId={
                                    existingPaperReport?.id ?? null
                                }
                            />
                        </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
