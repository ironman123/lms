//lobby/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import StartExamButton from "@/components/StartExamButton";
import { Timer, ClipboardCheck, AlertCircle, BookOpen, Layers, Trophy } from "lucide-react";
import { SessionMode, SessionStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { RESUMABLE_SESSION_STATUSES } from "@/lib/session-policy";

export default async function PaperLobbyPage({
    params,
    searchParams,
}: {
    params: Promise<{ paperId: string }>;
    searchParams: Promise<{ sessionUnavailable?: string }>;
}) {
    const { paperId } = await params;
    const { sessionUnavailable } = await searchParams;

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
        }),
    ]);

    if (!paper) notFound();
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
    const currentExam = paper.examQuestionPaperLinks[0]?.exam;

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
                                    <p className="font-black text-foreground">{examDuration}m</p>
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
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
