// app/(main)/actions/dashboard-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
    APP_TIME_ZONE,
    formatCompactDuration,
    getEffectiveStreak,
    toAppDateKey,
} from "@/lib/date-utils";

type AccMap = Record<string, { c: number; t: number }>;

// ── Overview ──────────────────────────────────────────────────────────────────
// Canonical totals come from completed sessions/interactions. UserStats remains
// a rebuildable cache for streaks and detailed breakdowns.
export async function getDashboardOverview() {
    const user = await requireAuth();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
        stats,
        examStatsRaw,
        recentSessions,
        heatmapSessions,
        sessionSummary,
        gradeSummary,
    ] =
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
                where: { userId: user.id, status: "COMPLETED" },
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
                    status: "COMPLETED",
                    startTime: { gte: thirtyDaysAgo },
                },
                select: {
                    startTime: true,
                    endTime: true,
                    completedAt: true,
                    attemptedCount: true,
                },
            }),

            prisma.testSession.aggregate({
                where: { userId: user.id, status: "COMPLETED" },
                _count: { _all: true },
                _sum: {
                    totalScore: true,
                    timeTakenSecs: true,
                },
            }),

            prisma.questionInteraction.groupBy({
                by: ["grade"],
                where: {
                    userId: user.id,
                    session: { status: "COMPLETED" },
                    grade: { in: ["CORRECT", "INCORRECT"] },
                },
                _count: { _all: true },
            }),
        ]);

    // ── Scalar totals ─────────────────────────────────────────────────────────
    const totalTests = sessionSummary._count._all;
    const correctQuestions =
        gradeSummary.find((row) => row.grade === "CORRECT")?._count._all ?? 0;
    const incorrectQuestions =
        gradeSummary.find((row) => row.grade === "INCORRECT")?._count._all ?? 0;
    const totalQuestions = correctQuestions + incorrectQuestions;
    const avgScore =
        totalTests > 0
            ? (sessionSummary._sum.totalScore ?? 0) / totalTests
            : 0;
    const accuracy =
        totalQuestions > 0
            ? (correctQuestions / totalQuestions) * 100
            : 0;
    const currentStreak =
        totalTests > 0
            ? getEffectiveStreak(
                stats?.currentStreak ?? 0,
                stats?.lastActiveDate
            )
            : 0;

    const totalSecs = sessionSummary._sum.timeTakenSecs ?? 0;
    const totalHours = Math.floor(totalSecs / 3600);
    const totalMinutes = Math.floor((totalSecs % 3600) / 60);
    const timeSpentStr =
        totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

    // ── JSON breakdowns ───────────────────────────────────────────────────────
    const typeAcc = (totalTests > 0 ? stats?.typeAccuracy ?? {} : {}) as AccMap;
    const diffAcc = (totalTests > 0 ? stats?.diffAccuracy ?? {} : {}) as AccMap;
    const subjAcc = (totalTests > 0 ? stats?.subjectAccuracy ?? {} : {}) as AccMap;

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
            timeZone: APP_TIME_ZONE,
            month: "short",
            day: "numeric",
        }),
        score: Math.round(s.totalScore ?? 0),
    }));

    // ── Exam performance cards ────────────────────────────────────────────────
    const examStats = (totalTests > 0 ? examStatsRaw : []).map((es) => {
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
        const dateStr = toAppDateKey(d);
        const count = heatmapSessions
            .filter((s) =>
                toAppDateKey(s.completedAt ?? s.endTime ?? s.startTime) ===
                dateStr
            )
            .reduce((sum, s) => sum + s.attemptedCount, 0);
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
                status: "COMPLETED",
                paper: { examQuestionPaperLinks: { some: { examId } } },
            },
            select: {
                id: true,
                paperId: true,
                startTime: true,
                endTime: true,
                totalScore: true,
                correctCount: true,
                totalQuestions: true,
                accuracy: true,
                timeTakenSecs: true,
                paper: { select: { title: true } },
                interactions: {
                    select: {
                        isCorrect: true,
                        grade: true,
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
            timeZone: APP_TIME_ZONE,
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
            if (i.grade !== "CORRECT" && i.grade !== "INCORRECT") {
                continue;
            }
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
    let totalAnswerChanges = 0,
        changedQuestionCount = 0,
        correctAfterHesitation = 0;

    sessions.forEach((s) =>
        s.interactions.forEach((i) => {
            const isObjectivelyGraded =
                i.grade === "CORRECT" || i.grade === "INCORRECT";
            if (isObjectivelyGraded && i.totalDwellTime > 0)
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
                totalAnswerChanges += i.hesitationCount;
                if (isObjectivelyGraded) {
                    changedQuestionCount++;
                    if (i.isCorrect) correctAfterHesitation++;
                }
            }
        })
    );

    const diagnostics = {
        avgCorrectTimeSec:
            correctCount > 0 ? Math.round(correctTime / correctCount) : 0,
        avgIncorrectTimeSec:
            incorrectCount > 0 ? Math.round(incorrectTime / incorrectCount) : 0,
        totalAnswerChanges,
        changedQuestionAccuracy:
            changedQuestionCount > 0
                ? Math.round(
                    (correctAfterHesitation / changedQuestionCount) * 100
                )
                : 0,
    };

    // ── Test history — uses stored session stats ───────────────────────────────
    const testHistory = [...sessions].reverse().map((s) => ({
        sessionId: s.id,
        paperId: s.paperId,
        title: s.paper.title,
        date: s.startTime.toLocaleDateString("en-IN", {
            timeZone: APP_TIME_ZONE,
        }),
        score: Math.round(s.totalScore ?? 0),
        correct: s.correctCount,
        total: s.totalQuestions,
        accuracy: Math.round(s.accuracy ?? 0),
        duration: formatCompactDuration(s.timeTakenSecs),
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
