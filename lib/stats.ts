// lib/stats.ts
import prisma from "@/lib/prisma";

interface QuestionResult {
    isCorrect: boolean;
    type: string;
    difficulty: string;
    topicPath: string | null;
}

interface UpdateUserStatsParams {
    userId: string;
    examId: string | null;
    sessionScore: number;   // 0-100 float
    timeTakenSecs: number;
    questions: QuestionResult[];
}

type AccMap = Record<string, { c: number; t: number }>;

// ── Main export ───────────────────────────────────────────────────────────────
// Called AFTER the session transaction completes. Non-fatal — a failure here
// never rolls back the session result.
export async function updateUserStats({
    userId,
    examId,
    sessionScore,
    timeTakenSecs,
    questions,
}: UpdateUserStatsParams): Promise<void> {
    try
    {
        const current = await prisma.userStats.findUnique({ where: { userId } });

        // ── Merge JSON breakdowns ─────────────────────────────────────────────
        const typeAcc: AccMap = (current?.typeAccuracy ?? {}) as AccMap;
        const diffAcc: AccMap = (current?.diffAccuracy ?? {}) as AccMap;
        const subjAcc: AccMap = (current?.subjectAccuracy ?? {}) as AccMap;

        const sessionCorrect = questions.filter((q) => q.isCorrect).length;

        for (const q of questions)
        {
            const subject = q.topicPath?.split(">")?.[0]?.trim() ?? "General";

            typeAcc[q.type] ??= { c: 0, t: 0 };
            typeAcc[q.type].t++;
            if (q.isCorrect) typeAcc[q.type].c++;

            diffAcc[q.difficulty] ??= { c: 0, t: 0 };
            diffAcc[q.difficulty].t++;
            if (q.isCorrect) diffAcc[q.difficulty].c++;

            subjAcc[subject] ??= { c: 0, t: 0 };
            subjAcc[subject].t++;
            if (q.isCorrect) subjAcc[subject].c++;
        }

        // ── Streak ────────────────────────────────────────────────────────────
        // All dates in UTC ISO "YYYY-MM-DD" to avoid timezone drift.
        const todayStr = new Date().toISOString().split("T")[0];
        const yestStr = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d.toISOString().split("T")[0];
        })();

        let streak = current?.currentStreak ?? 0;
        const lastDate = current?.lastActiveDate ?? null;

        if (lastDate !== todayStr)
        {
            if (lastDate === yestStr)
            {
                streak++; // Continuing streak
            } else
            {
                streak = 1; // Gap — reset
            }
        }
        // If lastDate === todayStr → already counted today, no change

        // ── Upsert UserStats ──────────────────────────────────────────────────
        await prisma.userStats.upsert({
            where: { userId },
            create: {
                userId,
                totalTests: 1,
                totalQuestions: questions.length,
                totalCorrect: sessionCorrect,
                totalStudySecs: timeTakenSecs,
                scoreSum: sessionScore,
                currentStreak: streak,
                lastActiveDate: todayStr,
                typeAccuracy: typeAcc,
                diffAccuracy: diffAcc,
                subjectAccuracy: subjAcc,
            },
            update: {
                totalTests: { increment: 1 },
                totalQuestions: { increment: questions.length },
                totalCorrect: { increment: sessionCorrect },
                totalStudySecs: { increment: timeTakenSecs },
                scoreSum: { increment: sessionScore },
                currentStreak: streak,
                lastActiveDate: todayStr,
                typeAccuracy: typeAcc,
                diffAccuracy: diffAcc,
                subjectAccuracy: subjAcc,
            },
        });

        // ── Upsert UserExamStats ──────────────────────────────────────────────
        if (examId)
        {
            const examStats = await prisma.userExamStats.findUnique({
                where: { userId_examId: { userId, examId } },
                select: { bestScore: true, lastScore: true },
            });

            await prisma.userExamStats.upsert({
                where: { userId_examId: { userId, examId } },
                create: {
                    userId,
                    examId,
                    testsAttempted: 1,
                    scoreSum: sessionScore,
                    bestScore: sessionScore,
                    lastScore: sessionScore,
                    prevScore: null,
                },
                update: {
                    testsAttempted: { increment: 1 },
                    scoreSum: { increment: sessionScore },
                    bestScore: Math.max(examStats?.bestScore ?? 0, sessionScore),
                    prevScore: examStats?.lastScore ?? null,
                    lastScore: sessionScore,
                },
            });
        }
    } catch (err)
    {
        // Log but never throw — stats update must not break the exam result flow
        console.error("[updateUserStats] failed:", err);
    }
}