import "dotenv/config";
import prisma from "../lib/prisma";

const now = new Date();
const [sessionPurposes, dueEntries, profileTotals] =
    await Promise.all([
        prisma.testSession.groupBy({
            by: ["purpose"],
            _count: { _all: true },
        }),
        prisma.mistakeNotebookEntry.findMany({
            where: {
                status: "ACTIVE",
                nextReviewAt: { lte: now },
                question: {
                    isArchived: false,
                    isCancelled: false,
                    paper: {
                        is: { isArchived: false, status: "PUBLISHED" },
                    },
                },
            },
            select: { question: { select: { paperId: true } } },
        }),
        prisma.userStats.aggregate({ _sum: { totalTests: true } }),
    ]);

const standardProcessed = await prisma.sessionStatsContribution.count({
    where: {
        processedAt: { not: null },
        session: { purpose: "STANDARD" },
    },
});
const repairProcessed = await prisma.sessionStatsContribution.count({
    where: {
        processedAt: { not: null },
        session: { purpose: "DAILY_REPAIR" },
    },
});
const duePaperCount = new Set(
    dueEntries.flatMap((entry) =>
        entry.question.paperId ? [entry.question.paperId] : []
    )
).size;
const storedProfileTests = profileTotals._sum.totalTests ?? 0;
const mismatches = storedProfileTests === standardProcessed ? 0 : 1;

console.log(
    JSON.stringify(
        {
            sessionPurposes,
            dueQuestions: dueEntries.length,
            duePapers: duePaperCount,
            standardProcessed,
            repairProcessed,
            storedProfileTests,
            mismatches,
        },
        null,
        2
    )
);

await prisma.$disconnect();
if (mismatches !== 0) process.exitCode = 1;
