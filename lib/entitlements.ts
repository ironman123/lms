import "server-only";

import prisma from "@/lib/prisma";
import type { ResultQuestion } from "@/lib/exam-results";
import {
    getPaperReadiness,
    type PaperReadiness,
} from "@/lib/paper-readiness";

export type SessionLaunchAccess =
    | { exists: false }
    | {
        exists: true;
        questionCount: number;
        questions: ResultQuestion[];
        readiness: PaperReadiness;
        durationMinutes: number;
        allowed: true;
      }
    | {
        exists: true;
        questionCount: number;
        durationMinutes: number;
        allowed: false;
        bundleId: string;
      };

/**
 * Resolves paper metadata and paid access together.
 *
 * FULL_ACCESS is scoped to an exam linked to the paper. MOCK_PACK access is
 * scoped to an active bundle for that same exam that explicitly contains the
 * paper. This avoids the previous cross-exam and empty-paperIds loopholes.
 */
export async function getSessionLaunchAccess(
    userId: string,
    paperId: string
): Promise<SessionLaunchAccess> {
    const now = new Date();
    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        select: {
            isArchived: true,
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    contentRevision: true,
                    content: true,
                    type: true,
                    difficulty: true,
                    topicPath: true,
                    marks: true,
                    negativeMarks: true,
                    explanation: true,
                    isCancelled: true,
                    options: true,
                    correctOptions: true,
                    exactAnswer: true,
                    answerMin: true,
                    answerMax: true,
                    modelAnswer: true,
                },
            },
            examQuestionPaperLinks: {
                select: {
                    exam: {
                        select: {
                            duration: true,
                            bundles: {
                                where: {
                                    isActive: true,
                                    OR: [
                                        { bundleType: "FULL_ACCESS" },
                                        {
                                            bundleType: "MOCK_PACK",
                                            paperIds: { has: paperId },
                                        },
                                    ],
                                },
                                orderBy: { price: "asc" },
                                select: {
                                    id: true,
                                    purchases: {
                                        where: {
                                            userId,
                                            status: "PAID",
                                            OR: [
                                                { expiresAt: null },
                                                { expiresAt: { gt: now } },
                                            ],
                                        },
                                        select: { id: true },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!paper || paper.isArchived) return { exists: false };

    const bundles = paper.examQuestionPaperLinks.flatMap(
        (link) => link.exam.bundles
    );
    const durationMinutes =
        paper.examQuestionPaperLinks[0]?.exam.duration ?? 60;
    const readiness = getPaperReadiness(paper.questions);
    const uniqueBundles = [...new Map(bundles.map((bundle) => [bundle.id, bundle])).values()];

    if (uniqueBundles.length === 0 || uniqueBundles.some((bundle) => bundle.purchases.length > 0)) {
        return {
            exists: true,
            questionCount: paper.questions.length,
            questions: paper.questions,
            readiness,
            durationMinutes,
            allowed: true,
        };
    }

    return {
        exists: true,
        questionCount: paper.questions.length,
        durationMinutes,
        allowed: false,
        bundleId: uniqueBundles[0].id,
    };
}
