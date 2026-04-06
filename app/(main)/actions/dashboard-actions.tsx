"use server";

import prisma from "@/lib/prisma";

const DUMMY_USER_ID = "dev-dummy-user-123";





// ── Overview stats ─────────────────────────────────────────────
export async function getDashboardOverview() {
    const sessions = await prisma.testSession.findMany({
        where: { userId: DUMMY_USER_ID, endTime: { not: null } },
        include: {
            interactions: {
                select: { isCorrect: true, question: { select: { marks: true } } }
            },
            paper: {
                select: {
                    title: true,
                    examQuestionPaperLinks: {
                        include: { exam: { select: { id: true, name: true, slug: true } } },
                        take: 1,
                    },
                    _count: { select: { questions: true } }
                }
            }
        },
        orderBy: { startTime: "desc" },
    });

    const totalTests = sessions.length;
    const totalQuestions = sessions.reduce((sum, s) => sum + s.interactions.length, 0);

    const scores = sessions.map(s => {
        const totalMarks = s.interactions.reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        const earned = s.interactions.filter(i => i.isCorrect).reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        return totalMarks > 0 ? (earned / totalMarks) * 100 : 0;
    });

    const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    const totalCorrect = sessions.reduce((sum, s) => sum + s.interactions.filter(i => i.isCorrect).length, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Group sessions by exam
    const examMap = new Map<string, {
        examId: string;
        examName: string;
        examSlug: string;
        sessions: typeof sessions;
    }>();

    for (const session of sessions)
    {
        const exam = session.paper.examQuestionPaperLinks[0]?.exam;
        if (!exam) continue;
        if (!examMap.has(exam.id))
        {
            examMap.set(exam.id, { examId: exam.id, examName: exam.name, examSlug: exam.slug, sessions: [] });
        }
        examMap.get(exam.id)!.sessions.push(session);
    }

    const examStats = [...examMap.values()].map(({ examId, examName, examSlug, sessions }) => {
        const examScores = sessions.map(s => {
            const total = s.interactions.reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
            const earned = s.interactions.filter(i => i.isCorrect).reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
            return total > 0 ? (earned / total) * 100 : 0;
        });
        const avg = examScores.reduce((a, b) => a + b, 0) / examScores.length;
        const best = Math.max(...examScores);

        const recentSessions = sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

        let trend: "improving" | "declining" | "neutral" = "neutral";

        if (recentSessions.length >= 2)
        {
            const latestScore = recentSessions[0].totalScore || 0;
            const previousScore = recentSessions[1].totalScore || 0;

            if (latestScore > previousScore)
            {
                trend = "improving";
            } else if (latestScore < previousScore)
            {
                trend = "declining";
            } else
            {
                trend = "neutral"; // 🔥 This catches the flatlines!
            }
        }
        return { examId, examName, examSlug, testsAttempted: sessions.length, avgScore: avg, bestScore: best, trend };
    });

    return { totalTests, totalQuestions, avgScore, accuracy, examStats };
}

// ── Exam detail ─────────────────────────────────────────────────
export async function getExamDashboard(examId: string) {
    const sessions = await prisma.testSession.findMany({
        where: {
            userId: DUMMY_USER_ID,
            endTime: { not: null },
            paper: { examQuestionPaperLinks: { some: { examId } } },
        },
        include: {
            paper: { select: { title: true, _count: { select: { questions: true } } } },
            interactions: {
                include: {
                    question: {
                        select: {
                            marks: true,
                            topicPath: true,
                        }
                    }
                }
            }
        },
        orderBy: { startTime: "asc" },
    });

    // Score trend
    const trend = sessions.map(s => {
        const total = s.interactions.reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        const earned = s.interactions.filter(i => i.isCorrect).reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        return {
            date: s.startTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            score: total > 0 ? Math.round((earned / total) * 100) : 0,
            accuracy: s.interactions.length > 0
                ? Math.round((s.interactions.filter(i => i.isCorrect).length / s.interactions.length) * 100)
                : 0,
        };
    });

    // Subject performance from topicPath (e.g. "Physics > Mechanics > Newton's Laws")
    const subjectMap = new Map<string, { correct: number; total: number }>();
    for (const session of sessions)
    {
        for (const interaction of session.interactions)
        {
            const subject = interaction.question.topicPath?.split(">")?.[0]?.trim() ?? "General";
            if (!subjectMap.has(subject)) subjectMap.set(subject, { correct: 0, total: 0 });
            const entry = subjectMap.get(subject)!;
            entry.total += 1;
            if (interaction.isCorrect) entry.correct += 1;
        }
    }

    const subjectStats = [...subjectMap.entries()].map(([subject, { correct, total }]) => ({
        subject,
        correct,
        total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    })).sort((a, b) => b.accuracy - a.accuracy);

    const weakSubjects = subjectStats.filter(s => s.accuracy < 60);
    const strongSubjects = subjectStats.filter(s => s.accuracy >= 75);

    // Test history
    const testHistory = sessions.reverse().map(s => {
        const total = s.interactions.reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        const earned = s.interactions.filter(i => i.isCorrect).reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        const correct = s.interactions.filter(i => i.isCorrect).length;
        const durationMs = s.endTime
            ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
            : 0;

        return {
            sessionId: s.id,
            paperId: s.paperId,
            title: s.paper.title,
            date: s.startTime.toLocaleDateString("en-IN"),
            score: total > 0 ? Math.round((earned / total) * 100) : 0,
            correct,
            total: s.interactions.length,
            accuracy: s.interactions.length > 0
                ? Math.round((correct / s.interactions.length) * 100)
                : 0,
            duration: Math.round(durationMs / 60000),
        };
    });

    const exam = await prisma.exam.findUnique({
        where: { id: examId },
        select: { name: true, slug: true },
    });

    return { exam, trend, subjectStats, weakSubjects, strongSubjects, testHistory };
}