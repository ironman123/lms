import "dotenv/config";
import prisma from "../lib/prisma";

const [sources, completedAttributed, completedUnclassified, contributions, stats, sampleLink] =
    await Promise.all([
        prisma.testSession.groupBy({
            by: ["examContextSource"],
            _count: { _all: true },
        }),
        prisma.testSession.count({
            where: { status: "COMPLETED", examId: { not: null } },
        }),
        prisma.testSession.count({
            where: { status: "COMPLETED", examId: null },
        }),
        prisma.sessionStatsContribution.findMany({
            select: {
                examId: true,
                processedAt: true,
                session: { select: { examId: true } },
            },
        }),
        prisma.userExamStats.aggregate({
            _sum: { testsAttempted: true },
        }),
        prisma.examQuestionPaperLink.findFirst({
            where: {
                paper: { status: "PUBLISHED", isArchived: false },
            },
            select: {
                paperId: true,
                exam: { select: { id: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

const mismatches = contributions.filter(
    (row) => row.examId !== row.session.examId
).length;
const classifiedProcessed = contributions.filter(
    (row) => row.processedAt && row.examId
).length;
const userExamStatsAttempts = stats._sum.testsAttempted ?? 0;

console.log(
    JSON.stringify(
        {
            sources,
            completedAttributed,
            completedUnclassified,
            mismatches,
            classifiedProcessed,
            userExamStatsAttempts,
            sampleLink,
        },
        null,
        2
    )
);

await prisma.$disconnect();

if (mismatches !== 0 || classifiedProcessed !== userExamStatsAttempts) {
    process.exitCode = 1;
}
