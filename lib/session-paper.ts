import "server-only";

import { cache } from "react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCachedPaper } from "@/lib/cache";

const sessionPaperInclude = {
    examQuestionPaperLinks: {
        include: {
            exam: {
                select: {
                    name: true,
                    duration: true,
                },
            },
        },
        take: 1,
    },
    questions: {
        where: { isArchived: false },
        orderBy: { position: "asc" },
    },
} satisfies Prisma.QuestionPaperInclude;

export type SessionPaper = Prisma.QuestionPaperGetPayload<{
    include: typeof sessionPaperInclude;
}>;

/**
 * React cache deduplicates the layout/page lookup during one navigation.
 * Redis keeps the paper warm across requests.
 */
export const getSessionPaper = cache(
    async (paperId: string): Promise<SessionPaper | null> =>
        getCachedPaper<SessionPaper | null>(paperId, () =>
            prisma.questionPaper.findUnique({
                where: { id: paperId },
                include: sessionPaperInclude,
            })
        )
);
