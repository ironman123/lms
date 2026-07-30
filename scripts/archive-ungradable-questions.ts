import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { getPaperReadiness } from "../lib/paper-readiness";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

try {
    const papers = await prisma.questionPaper.findMany({
        select: {
            title: true,
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    content: true,
                    type: true,
                    difficulty: true,
                    marks: true,
                    negativeMarks: true,
                    explanation: true,
                    topicPath: true,
                    options: true,
                    correctOptions: true,
                    exactAnswer: true,
                    answerMin: true,
                    answerMax: true,
                    modelAnswer: true,
                },
            },
        },
    });

    const invalidById = new Map<string, Set<string>>();
    for (const paper of papers) {
        for (const issue of getPaperReadiness(paper.questions).issues) {
            if (
                issue.code !== "INVALID_ANSWER_KEY" &&
                issue.code !== "INVALID_OPTIONS"
            ) continue;
            const codes = invalidById.get(issue.questionId) ?? new Set();
            codes.add(issue.code);
            invalidById.set(issue.questionId, codes);
        }
    }

    const ids = [...invalidById.keys()];
    console.info(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        questionsToArchive: ids.length,
        missingOrInvalidAnswerKey: [...invalidById.values()].filter(
            (codes) => codes.has("INVALID_ANSWER_KEY")
        ).length,
        invalidOptions: [...invalidById.values()].filter(
            (codes) => codes.has("INVALID_OPTIONS")
        ).length,
    }, null, 2));

    if (apply && ids.length > 0) {
        const result = await prisma.question.updateMany({
            where: { id: { in: ids }, isArchived: false },
            data: {
                isArchived: true,
                archivedAt: new Date(),
                archiveReason: "INVALID_FOR_AUTO_SCORING",
            },
        });
        console.info(JSON.stringify({ archived: result.count }, null, 2));
    }
} finally {
    await prisma.$disconnect();
}
