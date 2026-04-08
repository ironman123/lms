"use server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { userAgent } from "next/server";

// ── Overview stats ─────────────────────────────────────────────
export async function getDashboardOverview() {
    const user = await requireAuth();

    const sessions = await prisma.testSession.findMany({
        where: { userId: user.id, endTime: { not: null } },
        include: {
            interactions: {
                select: {
                    isCorrect: true,
                    question: {
                        select: {
                            marks: true,
                            topicPath: true,
                            type: true,
                            difficulty: true
                        }
                    }
                }
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

    // 🔥 Calculate Total Time Spent
    const totalDurationMs = sessions.reduce((sum, s) => {
        return sum + (s.endTime!.getTime() - s.startTime.getTime());
    }, 0);
    const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeSpentStr = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

    // Question Type Mastery & Difficulty Breakdown
    const typeMap = { MCQ: { c: 0, t: 0 }, MSQ: { c: 0, t: 0 }, NUMERICAL: { c: 0, t: 0 }, SUBJECTIVE: { c: 0, t: 0 } };
    const diffMap = { EASY: { c: 0, t: 0 }, MEDIUM: { c: 0, t: 0 }, HARD: { c: 0, t: 0 } };

    sessions.forEach(s => s.interactions.forEach(i => {
        const q = i.question;
        if (q.type) { typeMap[q.type as keyof typeof typeMap].t++; if (i.isCorrect) typeMap[q.type as keyof typeof typeMap].c++; }
        if (q.difficulty) { diffMap[q.difficulty as keyof typeof diffMap].t++; if (i.isCorrect) diffMap[q.difficulty as keyof typeof diffMap].c++; }
    }));

    const typeStats = Object.entries(typeMap).filter(([_, v]) => v.t > 0).map(([type, v]) => ({ type, accuracy: Math.round((v.c / v.t) * 100), total: v.t }));
    const diffStats = Object.entries(diffMap).filter(([_, v]) => v.t > 0).map(([diff, v]) => ({ diff, accuracy: Math.round((v.c / v.t) * 100), total: v.t }));

    // 🔥 Get Recent Activity (Top 3)
    const recentActivity = sessions.slice(0, 3).map(s => {
        const total = s.interactions.reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        const earned = s.interactions.filter(i => i.isCorrect).reduce((sum, i) => sum + (i.question.marks ?? 0), 0);
        return {
            id: s.id,
            paperId: s.paperId,
            title: s.paper.title,
            examSlug: s.paper.examQuestionPaperLinks[0]?.exam?.slug,
            date: s.startTime.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
            score: total > 0 ? Math.round((earned / total) * 100) : 0,
        };
    });

    // 🔥 Find Weakest Subject for Recommendation
    // We'll use the top-level subject from topicPath (e.g. "Physics > Mechanics" counts towards "Physics")
    const subjectMap = new Map<string, { correct: number; total: number }>();
    sessions.forEach(session => {
        session.interactions.forEach(interaction => {
            const subject = interaction.question.topicPath?.split(">")?.[0]?.trim() ?? "General";
            if (!subjectMap.has(subject)) subjectMap.set(subject, { correct: 0, total: 0 });
            const entry = subjectMap.get(subject)!;
            entry.total += 1;
            if (interaction.isCorrect) entry.correct += 1;
        });
    });

    const weakSubject = [...subjectMap.entries()]
        .map(([name, stats]) => ({ name, accuracy: (stats.correct / stats.total) * 100 }))
        .filter(s => s.accuracy < 60)
        .sort((a, b) => a.accuracy - b.accuracy)[0]; // Get the absolute 


    // 🔥 Calculate Current Streak
    const uniqueDates = [...new Set(sessions.map(s => s.endTime!.toISOString().split('T')[0]))].sort().reverse();
    let currentStreak = 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yestStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // 2. Check if the streak is alive (they took a test today or yesterday)
    if (uniqueDates.length > 0 && (uniqueDates[0] === todayStr || uniqueDates[0] === yestStr))
    {
        currentStreak = 1;
        let expectedDate = new Date(uniqueDates[0]);
        for (let i = 1; i < uniqueDates.length; i++)
        {
            expectedDate.setDate(expectedDate.getDate() - 1);
            if (uniqueDates[i] === expectedDate.toISOString().split('T')[0]) currentStreak++;
            else break;
        }
    }

    const heatmapData = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split('T')[0];
        const count = sessions.filter(s => s.endTime!.toISOString().split('T')[0] === dateStr)
            .reduce((sum, s) => sum + s.interactions.length, 0); // Questions solved that day
        return { date: dateStr, count };
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
                trend = "neutral";
            }
        }
        return { examId, examName, examSlug, testsAttempted: sessions.length, avgScore: avg, bestScore: best, trend };
    });

    return { totalTests, totalQuestions, avgScore, accuracy, examStats, timeSpentStr, recentActivity, weakSubject, currentStreak, heatmapData, typeStats, diffStats };
}

// ── Exam detail ─────────────────────────────────────────────────
export async function getExamDashboard(examId: string) {
    const user = await requireAuth();

    const sessions = await prisma.testSession.findMany({
        where: {
            userId: user.id,
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

    let correctTime = 0, correctCount = 0, incorrectTime = 0, incorrectCount = 0;
    let totalHesitations = 0, correctAfterHesitation = 0;

    sessions.forEach(s => s.interactions.forEach(i => {
        // Pacing
        if (i.totalDwellTime > 0)
        {
            if (i.isCorrect) { correctTime += i.totalDwellTime; correctCount++; }
            else { incorrectTime += i.totalDwellTime; incorrectCount++; }
        }
        // Hesitation
        if (i.hesitationCount > 0)
        {
            totalHesitations++;
            if (i.isCorrect) correctAfterHesitation++;
        }
    }));

    const diagnostics = {
        avgCorrectTimeSec: correctCount > 0 ? Math.round(correctTime / correctCount) : 0,
        avgIncorrectTimeSec: incorrectCount > 0 ? Math.round(incorrectTime / incorrectCount) : 0,
        totalHesitations,
        hesitationWinRate: totalHesitations > 0 ? Math.round((correctAfterHesitation / totalHesitations) * 100) : 0
    };

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

    return { exam, trend, subjectStats, weakSubjects, strongSubjects, testHistory, diagnostics };
}