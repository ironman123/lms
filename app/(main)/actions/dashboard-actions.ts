// app/(main)/actions/dashboard-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type AccMap = Record<string, { c: number; t: number }>;

// ── Overview ──────────────────────────────────────────────────────────────────
// 4 parallel queries instead of 1 unbounded monster.
export async function getDashboardOverview() {
    const user = await requireAuth();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [stats, examStatsRaw, recentSessions, heatmapSessions] =
        await Promise.all([
            // 1. Scalar aggregates + JSON breakdowns — 1 row
            prisma.userStats.findUnique({ where: { userId: user.id } }),

            // 2. Per-exam aggregates — N rows (one per exam the user has attempted)
            prisma.userExamStats.findMany({
                where: { userId: user.id },
                include: {
                    exam: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { updatedAt: "desc" },
            }),

            // 3. Last 3 sessions for "Recent Activity" — title, score, date only
            prisma.testSession.findMany({
                where: { userId: user.id, endTime: { not: null } },
                select: {
                    id: true,
                    paperId: true,
                    startTime: true,
                    totalScore: true,
                    paper: {
                        select: {
                            title: true,
                            examQuestionPaperLinks: {
                                select: { exam: { select: { slug: true } } },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: { startTime: "desc" },
                take: 3,
            }),

            // 4. Last 30 days of sessions — date + interaction count for heatmap
            prisma.testSession.findMany({
                where: {
                    userId: user.id,
                    endTime: { not: null },
                    startTime: { gte: thirtyDaysAgo },
                },
                select: {
                    endTime: true,
                    _count: { select: { interactions: true } },
                },
            }),
        ]);

    // ── Scalar totals ─────────────────────────────────────────────────────────
    const totalTests = stats?.totalTests ?? 0;
    const totalQuestions = stats?.totalQuestions ?? 0;
    const avgScore = totalTests > 0 ? (stats?.scoreSum ?? 0) / totalTests : 0;
    const accuracy =
        totalQuestions > 0
            ? ((stats?.totalCorrect ?? 0) / totalQuestions) * 100
            : 0;
    const currentStreak = stats?.currentStreak ?? 0;

    const totalSecs = stats?.totalStudySecs ?? 0;
    const totalHours = Math.floor(totalSecs / 3600);
    const totalMinutes = Math.floor((totalSecs % 3600) / 60);
    const timeSpentStr =
        totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

    // ── JSON breakdowns ───────────────────────────────────────────────────────
    const typeAcc = (stats?.typeAccuracy ?? {}) as AccMap;
    const diffAcc = (stats?.diffAccuracy ?? {}) as AccMap;
    const subjAcc = (stats?.subjectAccuracy ?? {}) as AccMap;

    const typeStats = Object.entries(typeAcc).map(([type, v]) => ({
        type,
        accuracy: Math.round((v.c / v.t) * 100),
        total: v.t,
    }));

    const diffStats = Object.entries(diffAcc).map(([diff, v]) => ({
        diff,
        accuracy: Math.round((v.c / v.t) * 100),
        total: v.t,
    }));

    const weakSubject =
        Object.entries(subjAcc)
            .map(([name, v]) => ({ name, accuracy: (v.c / v.t) * 100 }))
            .filter((s) => s.accuracy < 60)
            .sort((a, b) => a.accuracy - b.accuracy)[0] ?? null;

    // ── Recent activity ───────────────────────────────────────────────────────
    const recentActivity = recentSessions.map((s) => ({
        id: s.id,
        paperId: s.paperId,
        title: s.paper.title,
        examSlug: s.paper.examQuestionPaperLinks[0]?.exam?.slug,
        date: s.startTime.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
        }),
        score: Math.round(s.totalScore ?? 0),
    }));

    // ── Exam performance cards ────────────────────────────────────────────────
    const examStats = examStatsRaw.map((es) => {
        const avg =
            es.testsAttempted > 0 ? es.scoreSum / es.testsAttempted : 0;

        let trend: "improving" | "declining" | "neutral" = "neutral";
        if (es.lastScore != null && es.prevScore != null)
        {
            if (es.lastScore > es.prevScore) trend = "improving";
            else if (es.lastScore < es.prevScore) trend = "declining";
        }

        return {
            examId: es.examId,
            examName: es.exam.name,
            examSlug: es.exam.slug,
            testsAttempted: es.testsAttempted,
            avgScore: avg,
            bestScore: es.bestScore,
            trend,
        };
    });

    // ── 30-day heatmap ────────────────────────────────────────────────────────
    const heatmapData = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split("T")[0];
        const count = heatmapSessions
            .filter((s) => s.endTime!.toISOString().split("T")[0] === dateStr)
            .reduce((sum, s) => sum + s._count.interactions, 0);
        return { date: dateStr, count };
    });

    return {
        totalTests,
        totalQuestions,
        avgScore,
        accuracy,
        examStats,
        timeSpentStr,
        recentActivity,
        weakSubject,
        currentStreak,
        heatmapData,
        typeStats,
        diffStats,
    };
}

// ── Exam detail ───────────────────────────────────────────────────────────────
// Trend uses stored totalScore/accuracy — no marks recomputation.
// Interactions are still fetched but only for subject breakdown + diagnostics.
export async function getExamDashboard(examId: string) {
    const user = await requireAuth();

    const [sessions, exam] = await Promise.all([
        prisma.testSession.findMany({
            where: {
                userId: user.id,
                endTime: { not: null },
                paper: { examQuestionPaperLinks: { some: { examId } } },
            },
            select: {
                id: true,
                paperId: true,
                startTime: true,
                endTime: true,
                totalScore: true,
                correctCount: true,
                accuracy: true,
                timeTakenSecs: true,
                paper: { select: { title: true } },
                interactions: {
                    select: {
                        isCorrect: true,
                        totalDwellTime: true,
                        hesitationCount: true,
                        question: {
                            select: { topicPath: true },
                        },
                    },
                },
            },
            orderBy: { startTime: "asc" },
        }),

        prisma.exam.findUnique({
            where: { id: examId },
            select: { name: true, slug: true },
        }),
    ]);

    // ── Score trend — uses stored values ──────────────────────────────────────
    const trend = sessions.map((s) => ({
        date: s.startTime.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        }),
        score: Math.round(s.totalScore ?? 0),
        accuracy: Math.round(s.accuracy ?? 0),
    }));

    // ── Subject breakdown ─────────────────────────────────────────────────────
    const subjectMap = new Map<string, { correct: number; total: number }>();

    for (const session of sessions)
    {
        for (const i of session.interactions)
        {
            const subject =
                i.question.topicPath?.split(">")?.[0]?.trim() ?? "General";
            if (!subjectMap.has(subject))
                subjectMap.set(subject, { correct: 0, total: 0 });
            const entry = subjectMap.get(subject)!;
            entry.total++;
            if (i.isCorrect) entry.correct++;
        }
    }

    const subjectStats = [...subjectMap.entries()]
        .map(([subject, { correct, total }]) => ({
            subject,
            correct,
            total,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        }))
        .sort((a, b) => b.accuracy - a.accuracy);

    // ── Diagnostics ───────────────────────────────────────────────────────────
    let correctTime = 0,
        correctCount = 0,
        incorrectTime = 0,
        incorrectCount = 0;
    let totalHesitations = 0,
        correctAfterHesitation = 0;

    sessions.forEach((s) =>
        s.interactions.forEach((i) => {
            if (i.totalDwellTime > 0)
            {
                if (i.isCorrect)
                {
                    correctTime += i.totalDwellTime;
                    correctCount++;
                } else
                {
                    incorrectTime += i.totalDwellTime;
                    incorrectCount++;
                }
            }
            if (i.hesitationCount > 0)
            {
                totalHesitations++;
                if (i.isCorrect) correctAfterHesitation++;
            }
        })
    );

    const diagnostics = {
        avgCorrectTimeSec:
            correctCount > 0 ? Math.round(correctTime / correctCount) : 0,
        avgIncorrectTimeSec:
            incorrectCount > 0 ? Math.round(incorrectTime / incorrectCount) : 0,
        totalHesitations,
        hesitationWinRate:
            totalHesitations > 0
                ? Math.round((correctAfterHesitation / totalHesitations) * 100)
                : 0,
    };

    // ── Test history — uses stored session stats ───────────────────────────────
    const testHistory = [...sessions].reverse().map((s) => ({
        sessionId: s.id,
        paperId: s.paperId,
        title: s.paper.title,
        date: s.startTime.toLocaleDateString("en-IN"),
        score: Math.round(s.totalScore ?? 0),
        correct: s.correctCount,
        total: s.interactions.length,
        accuracy: Math.round(s.accuracy ?? 0),
        duration: s.timeTakenSecs ? Math.floor(s.timeTakenSecs / 60) : 0,
    }));

    return {
        exam,
        trend,
        subjectStats,
        weakSubjects: subjectStats.filter((s) => s.accuracy < 60),
        strongSubjects: subjectStats.filter((s) => s.accuracy >= 75),
        testHistory,
        diagnostics,
    };
}