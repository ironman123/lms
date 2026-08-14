import "server-only";

import {
    ModerationActionType,
    ModerationCaseStatus,
    ModerationTargetType,
    Prisma,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    buildPaperCaseKey,
    buildQuestionCaseKey,
    shouldEscalate,
} from "@/lib/moderation/report-policy";
import {
    moderationCaseTransitionSchema,
    moderationCaseAssignmentSchema,
    moderationCaseMergeSchema,
    moderationConfigInputSchema,
    type ModerationCaseTransitionInput,
    type ModerationCaseAssignmentInput,
    type ModerationCaseMergeInput,
    type ModerationConfigInput,
} from "@/lib/moderation/schemas";
import {
    buildContentPerformance,
    buildExamContentHealth,
    buildPaperContentHealth,
} from "@/lib/moderation/content-health";
import {
    buildQuestionQualityQueue,
    evaluateQuestionQuality,
    type QuestionQualityIndicator,
} from "@/lib/moderation/question-quality";

const CONFIG_SELECT = {
    questionReportThreshold: true,
    paperReportThreshold: true,
    reportLimitPerHour: true,
    reportLimitPerDay: true,
    maxCommentLength: true,
} satisfies Prisma.ModerationConfigSelect;

export async function getModerationConfig() {
    return prisma.moderationConfig.upsert({
        where: { id: "global" },
        create: { id: "global" },
        update: {},
        select: CONFIG_SELECT,
    });
}

export async function getRecentModerationConfigAudits() {
    return prisma.moderationConfigAudit.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
            actor: { select: { name: true, email: true } },
        },
    });
}

export async function getOpenModerationAttentionCount() {
    return prisma.moderationCase.count({
        where: {
            isEscalated: true,
            status: {
                in: [
                    ModerationCaseStatus.OPEN,
                    ModerationCaseStatus.IN_REVIEW,
                ],
            },
        },
    });
}

export async function getModerationAdmins() {
    return prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true },
    });
}

export async function getModerationMergeCandidates(caseId: string) {
    const current = await prisma.moderationCase.findUnique({
        where: { id: caseId },
        select: {
            targetType: true,
            questionId: true,
            paperId: true,
            snapshotHash: true,
        },
    });
    if (!current) return [];
    return prisma.moderationCase.findMany({
        where: {
            id: { not: caseId },
            targetType: current.targetType,
            questionId: current.questionId,
            paperId: current.paperId,
            snapshotHash: current.snapshotHash,
        },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            status: true,
            uniqueReporterCount: true,
            createdAt: true,
        },
    });
}

export type ModerationQueueFilters = {
    status?: ModerationCaseStatus;
    targetType?: ModerationTargetType;
    attention?: "ESCALATED" | "BELOW_THRESHOLD";
    page?: number;
};

export async function getModerationQueue(filters: ModerationQueueFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = 20;
    const where: Prisma.ModerationCaseWhereInput = {
        status: filters.status,
        targetType: filters.targetType,
        isEscalated:
            filters.attention === "ESCALATED"
                ? true
                : filters.attention === "BELOW_THRESHOLD"
                  ? false
                  : undefined,
    };

    const [cases, total, needsAttention, belowThreshold, inReview] =
        await Promise.all([
            prisma.moderationCase.findMany({
                where,
                orderBy: [
                    { isEscalated: "desc" },
                    { uniqueReporterCount: "desc" },
                    { updatedAt: "desc" },
                ],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    question: {
                        select: {
                            id: true,
                            content: true,
                            contentRevision: true,
                            isArchived: true,
                            paper: {
                                select: { id: true, title: true },
                            },
                        },
                    },
                    paper: { select: { id: true, title: true } },
                    assignedTo: { select: { id: true, name: true } },
                    reports: {
                        where: { withdrawnAt: null },
                        orderBy: { updatedAt: "desc" },
                        take: 3,
                        select: { category: true, comment: true },
                    },
                },
            }),
            prisma.moderationCase.count({ where }),
            prisma.moderationCase.count({
                where: {
                    isEscalated: true,
                    status: {
                        in: [
                            ModerationCaseStatus.OPEN,
                            ModerationCaseStatus.IN_REVIEW,
                        ],
                    },
                },
            }),
            prisma.moderationCase.count({
                where: {
                    isEscalated: false,
                    status: ModerationCaseStatus.OPEN,
                },
            }),
            prisma.moderationCase.count({
                where: { status: ModerationCaseStatus.IN_REVIEW },
            }),
        ]);

    return {
        cases,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        counts: { needsAttention, belowThreshold, inReview },
    };
}

async function getContentHealthInputs() {
    const cases = await prisma.moderationCase.findMany({
        where: {
            status: {
                in: [
                    ModerationCaseStatus.OPEN,
                    ModerationCaseStatus.IN_REVIEW,
                ],
            },
        },
        select: {
            id: true,
            targetType: true,
            isEscalated: true,
            updatedAt: true,
            question: {
                select: {
                    id: true,
                    paper: {
                        select: {
                            id: true,
                            title: true,
                            examQuestionPaperLinks: {
                                select: {
                                    exam: {
                                        select: {
                                            id: true,
                                            name: true,
                                            slug: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            paper: {
                select: {
                    id: true,
                    title: true,
                    examQuestionPaperLinks: {
                        select: {
                            exam: {
                                select: { id: true, name: true, slug: true },
                            },
                        },
                    },
                },
            },
            reports: {
                where: { withdrawnAt: null },
                select: { reporterId: true, category: true, updatedAt: true },
            },
        },
    });

    const normalizedCases = cases.flatMap((moderationCase) => {
        const paper = moderationCase.question?.paper ?? moderationCase.paper;
        if (!paper) return [];
        return [
            {
                id: moderationCase.id,
                paper: {
                    id: paper.id,
                    title: paper.title,
                    exams: paper.examQuestionPaperLinks.map(({ exam }) => exam),
                },
                questionId: moderationCase.question?.id ?? null,
                isEscalated: moderationCase.isEscalated,
                updatedAt: moderationCase.updatedAt,
                reports: moderationCase.reports,
            },
        ];
    });
    const paperIds = [...new Set(normalizedCases.map((row) => row.paper.id))];
    const completedAttemptCounts =
        paperIds.length === 0
            ? []
            : await prisma.testSession.groupBy({
                  by: ["paperId"],
                  where: {
                      paperId: { in: paperIds },
                      status: "COMPLETED",
                      purpose: "STANDARD",
                  },
                  _count: { _all: true },
              });

    return { normalizedCases, completedAttemptCounts };
}

export async function getPaperContentHealth() {
    const { normalizedCases, completedAttemptCounts } =
        await getContentHealthInputs();
    return buildPaperContentHealth(
        normalizedCases,
        new Map(
            completedAttemptCounts.map((row) => [row.paperId, row._count._all])
        )
    );
}

export async function getExamContentHealth() {
    const { normalizedCases, completedAttemptCounts } =
        await getContentHealthInputs();
    const paperAttempts = new Map(
        completedAttemptCounts.map((row) => [row.paperId, row._count._all])
    );
    const papers = buildPaperContentHealth(normalizedCases, paperAttempts);
    const examIds = [...new Set(papers.flatMap((paper) => paper.exams.map((exam) => exam.id)))];
    const completedAttemptCountsByExam =
        examIds.length === 0
            ? []
            : await prisma.testSession.groupBy({
                  by: ["examId"],
                  where: {
                      examId: { in: examIds },
                      status: "COMPLETED",
                      purpose: "STANDARD",
                  },
                  _count: { _all: true },
              });
    const reporterIdsByPaper = new Map<string, Set<string>>();
    const questionIdsByPaper = new Map<string, Set<string>>();
    for (const moderationCase of normalizedCases) {
        const reporters = reporterIdsByPaper.get(moderationCase.paper.id) ?? new Set<string>();
        moderationCase.reports.forEach((report) => reporters.add(report.reporterId));
        reporterIdsByPaper.set(moderationCase.paper.id, reporters);
        if (moderationCase.questionId) {
            const questionIds = questionIdsByPaper.get(moderationCase.paper.id) ?? new Set<string>();
            questionIds.add(moderationCase.questionId);
            questionIdsByPaper.set(moderationCase.paper.id, questionIds);
        }
    }
    return buildExamContentHealth(
        papers,
        new Map(
            completedAttemptCountsByExam
                .filter((row): row is typeof row & { examId: string } => row.examId !== null)
                .map((row) => [row.examId, row._count._all])
        ),
        reporterIdsByPaper,
        questionIdsByPaper
    );
}

export async function getPaperContentPerformance(paperIds: string[]) {
    if (paperIds.length === 0) return new Map();
    const [statusCounts, completedMetrics] = await Promise.all([
        prisma.testSession.groupBy({
            by: ["paperId", "status"],
            where: { paperId: { in: paperIds }, purpose: "STANDARD" },
            _count: { _all: true },
        }),
        prisma.testSession.groupBy({
            by: ["paperId"],
            where: {
                paperId: { in: paperIds },
                purpose: "STANDARD",
                status: "COMPLETED",
            },
            _count: { _all: true },
            _avg: {
                totalScore: true,
                accuracy: true,
                timeTakenSecs: true,
            },
        }),
    ]);
    const statusesByPaper = new Map<string, Map<string, number>>();
    for (const row of statusCounts) {
        const statuses = statusesByPaper.get(row.paperId) ?? new Map<string, number>();
        statuses.set(row.status, row._count._all);
        statusesByPaper.set(row.paperId, statuses);
    }
    const completedByPaper = new Map(
        completedMetrics.map((row) => [row.paperId, row])
    );
    return new Map(
        paperIds.map((paperId) => {
            const completed = completedByPaper.get(paperId);
            return [
                paperId,
                buildContentPerformance(statusesByPaper.get(paperId) ?? new Map(), {
                    completedSessionCount: completed?._count._all ?? 0,
                    averageScore: completed?._avg.totalScore ?? null,
                    averageAccuracy: completed?._avg.accuracy ?? null,
                    averageTimeTakenSecs: completed?._avg.timeTakenSecs ?? null,
                }),
            ] as const;
        })
    );
}

export async function getQuestionQualityQueue(filters?: { paperId?: string }) {
    const cases = await prisma.moderationCase.findMany({
        where: {
            targetType: "QUESTION",
            status: {
                in: [
                    ModerationCaseStatus.OPEN,
                    ModerationCaseStatus.IN_REVIEW,
                ],
            },
            questionId: { not: null },
            question: filters?.paperId
                ? { is: { paperId: filters.paperId } }
                : undefined,
        },
        select: {
            id: true,
            questionId: true,
            isEscalated: true,
            updatedAt: true,
            question: {
                select: {
                    content: true,
                    paper: { select: { id: true, title: true } },
                },
            },
            reports: {
                where: { withdrawnAt: null },
                select: { reporterId: true, category: true, updatedAt: true },
            },
        },
    });
    const normalizedCases = cases.flatMap((moderationCase) => {
        if (!moderationCase.questionId || !moderationCase.question) return [];
        return [
            {
                caseId: moderationCase.id,
                questionId: moderationCase.questionId,
                content: moderationCase.question.content,
                paper: moderationCase.question.paper,
                isEscalated: moderationCase.isEscalated,
                updatedAt: moderationCase.updatedAt,
                reports: moderationCase.reports,
            },
        ];
    });
    const questionIds = [...new Set(normalizedCases.map((item) => item.questionId))];
    if (questionIds.length === 0) return [];
    const daily = await prisma.questionAnalyticsDaily.groupBy({
        by: ["questionId"],
        where: { questionId: { in: questionIds } },
        _sum: {
            correctCount: true,
            incorrectCount: true,
            skippedCount: true,
            totalDwellSeconds: true,
            interactionCount: true,
        },
    });
    const metricsByQuestion = new Map(
        questionIds.map((questionId) => [
            questionId,
            {
                questionId,
                correctCount: 0,
                incorrectCount: 0,
                skippedCount: 0,
                averageDwellSeconds: null as number | null,
            },
        ])
    );
    for (const row of daily) {
        const metrics = metricsByQuestion.get(row.questionId);
        if (!metrics) continue;
        metrics.correctCount = row._sum.correctCount ?? 0;
        metrics.incorrectCount = row._sum.incorrectCount ?? 0;
        metrics.skippedCount = row._sum.skippedCount ?? 0;
        const interactionCount = row._sum.interactionCount ?? 0;
        metrics.averageDwellSeconds =
            interactionCount > 0
                ? Math.round((row._sum.totalDwellSeconds ?? 0) / interactionCount)
                : null;
    }
    return buildQuestionQualityQueue(normalizedCases, metricsByQuestion);
}

/**
 * Editor-safe, durable evidence for every question in one paper. The data is
 * read from daily aggregates, never from historical QuestionInteraction rows.
 */
export async function getQuestionQualityIndicatorsForPaper(
    paperId: string
): Promise<Record<string, QuestionQualityIndicator>> {
    const questions = await prisma.question.findMany({
        where: { paperId, isArchived: false },
        select: { id: true, avgTimeSeconds: true },
    });
    const questionIds = questions.map((question) => question.id);
    if (questionIds.length === 0) return {};

    const [dailyRows, cases, optionRows, confidenceRows] = await Promise.all([
        prisma.questionAnalyticsDaily.groupBy({
            by: ["questionId"],
            where: { questionId: { in: questionIds } },
            _sum: {
                interactionCount: true,
                correctCount: true,
                incorrectCount: true,
                skippedCount: true,
                totalDwellSeconds: true,
            },
        }),
        prisma.moderationCase.findMany({
            where: {
                targetType: "QUESTION",
                questionId: { in: questionIds },
                status: {
                    in: [
                        ModerationCaseStatus.OPEN,
                        ModerationCaseStatus.IN_REVIEW,
                    ],
                },
            },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                questionId: true,
                isEscalated: true,
                reports: {
                    where: { withdrawnAt: null },
                    select: { reporterId: true, category: true },
                },
            },
        }),
        prisma.questionOptionAnalyticsDaily.findMany({
            where: { daily: { questionId: { in: questionIds } } },
            select: {
                selectedAnswer: true,
                selectionCount: true,
                daily: { select: { questionId: true } },
            },
        }),
        prisma.questionConfidenceAnalyticsDaily.findMany({
            where: { daily: { questionId: { in: questionIds } } },
            select: {
                confidenceLevel: true,
                correctCount: true,
                incorrectCount: true,
                daily: { select: { questionId: true } },
            },
        }),
    ]);

    const dailyByQuestion = new Map(dailyRows.map((row) => [row.questionId, row]));
    const caseByQuestion = new Map<
        string,
        {
            caseId: string;
            isEscalated: boolean;
            reporterIds: Set<string>;
            reportCount: number;
            categories: Map<string, number>;
        }
    >();
    for (const moderationCase of cases) {
        if (!moderationCase.questionId) continue;
        const entry = caseByQuestion.get(moderationCase.questionId) ?? {
            caseId: moderationCase.id,
            isEscalated: false,
            reporterIds: new Set<string>(),
            reportCount: 0,
            categories: new Map<string, number>(),
        };
        entry.isEscalated ||= moderationCase.isEscalated;
        for (const report of moderationCase.reports) {
            entry.reporterIds.add(report.reporterId);
            entry.reportCount += 1;
            entry.categories.set(
                report.category,
                (entry.categories.get(report.category) ?? 0) + 1
            );
        }
        caseByQuestion.set(moderationCase.questionId, entry);
    }

    const optionsByQuestion = new Map<string, Map<string, number>>();
    for (const row of optionRows) {
        const options = optionsByQuestion.get(row.daily.questionId) ?? new Map();
        options.set(
            row.selectedAnswer,
            (options.get(row.selectedAnswer) ?? 0) + row.selectionCount
        );
        optionsByQuestion.set(row.daily.questionId, options);
    }
    const confidenceByQuestion = new Map<
        string,
        Map<number, { correctCount: number; incorrectCount: number }>
    >();
    for (const row of confidenceRows) {
        const confidence = confidenceByQuestion.get(row.daily.questionId) ?? new Map();
        const existing = confidence.get(row.confidenceLevel) ?? {
            correctCount: 0,
            incorrectCount: 0,
        };
        existing.correctCount += row.correctCount;
        existing.incorrectCount += row.incorrectCount;
        confidence.set(row.confidenceLevel, existing);
        confidenceByQuestion.set(row.daily.questionId, confidence);
    }

    return Object.fromEntries(
        questions.map((question) => {
            const daily = dailyByQuestion.get(question.id)?._sum;
            const interactionCount = daily?.interactionCount ?? 0;
            const correctCount = daily?.correctCount ?? 0;
            const incorrectCount = daily?.incorrectCount ?? 0;
            const skippedCount = daily?.skippedCount ?? 0;
            const caseEntry = caseByQuestion.get(question.id);
            const quality = evaluateQuestionQuality({
                correctCount,
                incorrectCount,
                skippedCount,
                averageDwellSeconds:
                    interactionCount > 0
                        ? Math.round((daily?.totalDwellSeconds ?? 0) / interactionCount)
                        : null,
                expectedTimeSeconds: question.avgTimeSeconds,
                hasOpenCase: Boolean(caseEntry),
                isEscalated: caseEntry?.isEscalated ?? false,
                uniqueReporterCount: caseEntry?.reporterIds.size ?? 0,
            });
            return [
                question.id,
                {
                    ...quality,
                    caseId: caseEntry?.caseId ?? null,
                    reportCount: caseEntry?.reportCount ?? 0,
                    topCategories: [...(caseEntry?.categories ?? new Map()).entries()]
                        .sort((left, right) => right[1] - left[1])
                        .slice(0, 3)
                        .map(([category, count]) => ({
                            category: category as QuestionQualityIndicator["topCategories"][number]["category"],
                            count,
                        })),
                    optionSelections: [...(optionsByQuestion.get(question.id) ?? new Map()).entries()]
                        .sort((left, right) => right[1] - left[1])
                        .map(([selectedAnswer, count]) => ({ selectedAnswer, count })),
                    confidence: [...(confidenceByQuestion.get(question.id) ?? new Map()).entries()]
                        .sort((left, right) => left[0] - right[0])
                        .map(([level, counts]) => ({ level, ...counts })),
                } satisfies QuestionQualityIndicator,
            ];
        })
    );
}

export async function getPaperContentHealthDetail(paperId: string) {
    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        select: {
            id: true,
            title: true,
            status: true,
            isArchived: true,
            examQuestionPaperLinks: {
                select: {
                    exam: { select: { id: true, name: true, slug: true } },
                },
            },
        },
    });
    if (!paper) return null;
    const cases = await prisma.moderationCase.findMany({
        where: {
            OR: [
                { paperId },
                { question: { is: { paperId } } },
            ],
        },
        select: {
            id: true,
            targetType: true,
            status: true,
            isEscalated: true,
            updatedAt: true,
            reports: {
                where: { withdrawnAt: null },
                orderBy: { updatedAt: "desc" },
                select: { id: true, category: true, comment: true, updatedAt: true },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
    const [health, performance, questions] = await Promise.all([
        getPaperContentHealth(),
        getPaperContentPerformance([paperId]),
        getQuestionQualityQueue({ paperId }),
    ]);
    return {
        paper,
        health: health.find((entry) => entry.paperId === paperId) ?? null,
        performance: performance.get(paperId) ?? null,
        questions,
        cases,
    };
}

export async function getModerationCase(caseId: string) {
    return prisma.moderationCase.findUnique({
        where: { id: caseId },
        include: {
            question: {
                include: {
                    paper: {
                        include: {
                            examQuestionPaperLinks: {
                                select: {
                                    exam: {
                                        select: {
                                            id: true,
                                            name: true,
                                            slug: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            paper: {
                include: {
                    examQuestionPaperLinks: {
                        select: {
                            exam: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                },
            },
            assignedTo: {
                select: { id: true, name: true, email: true },
            },
            reports: {
                orderBy: { updatedAt: "desc" },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    session: {
                        select: {
                            id: true,
                            mode: true,
                            status: true,
                        },
                    },
                },
            },
            actions: {
                orderBy: { createdAt: "desc" },
                include: {
                    actor: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
        },
    });
}

export async function updateModerationConfig(
    actorId: string,
    rawInput: ModerationConfigInput
) {
    const input = moderationConfigInputSchema.parse(rawInput);
    return prisma.$transaction(async (tx) => {
        const before = await tx.moderationConfig.upsert({
            where: { id: "global" },
            create: { id: "global" },
            update: {},
            select: CONFIG_SELECT,
        });
        const after = await tx.moderationConfig.update({
            where: { id: "global" },
            data: { ...input, updatedById: actorId },
            select: CONFIG_SELECT,
        });

        await tx.moderationConfigAudit.create({
            data: {
                actorId,
                before,
                after,
            },
        });

        const activeStatuses = [
            ModerationCaseStatus.OPEN,
            ModerationCaseStatus.IN_REVIEW,
        ];
        const now = new Date();
        const newlyEscalated = await tx.moderationCase.findMany({
            where: {
                status: { in: activeStatuses },
                isEscalated: false,
                OR: [
                    {
                        targetType: ModerationTargetType.QUESTION,
                        uniqueReporterCount: {
                            gte: input.questionReportThreshold,
                        },
                    },
                    {
                        targetType: ModerationTargetType.PAPER,
                        uniqueReporterCount: {
                            gte: input.paperReportThreshold,
                        },
                    },
                ],
            },
            select: { id: true, uniqueReporterCount: true, targetType: true },
        });
        await tx.moderationCase.updateMany({
            where: {
                targetType: ModerationTargetType.QUESTION,
                status: { in: activeStatuses },
                isEscalated: false,
                uniqueReporterCount: {
                    gte: input.questionReportThreshold,
                },
            },
            data: { isEscalated: true, escalatedAt: now },
        });
        await tx.moderationCase.updateMany({
            where: {
                targetType: ModerationTargetType.QUESTION,
                status: { in: activeStatuses },
                uniqueReporterCount: {
                    lt: input.questionReportThreshold,
                },
            },
            data: { isEscalated: false },
        });
        await tx.moderationCase.updateMany({
            where: {
                targetType: ModerationTargetType.PAPER,
                status: { in: activeStatuses },
                isEscalated: false,
                uniqueReporterCount: {
                    gte: input.paperReportThreshold,
                },
            },
            data: { isEscalated: true, escalatedAt: now },
        });
        await tx.moderationCase.updateMany({
            where: {
                targetType: ModerationTargetType.PAPER,
                status: { in: activeStatuses },
                uniqueReporterCount: {
                    lt: input.paperReportThreshold,
                },
            },
            data: { isEscalated: false },
        });

        if (newlyEscalated.length > 0) {
            await tx.moderationAction.createMany({
                data: newlyEscalated.map((moderationCase) => ({
                    caseId: moderationCase.id,
                    actorId,
                    action: ModerationActionType.ESCALATED,
                    note: "Escalated after moderation thresholds changed.",
                    metadata: {
                        reason: "THRESHOLD_CHANGED",
                        uniqueReporterCount:
                            moderationCase.uniqueReporterCount,
                        targetType: moderationCase.targetType,
                    },
                })),
            });
        }

        return after;
    });
}

export async function transitionModerationCase(
    actorId: string,
    rawInput: ModerationCaseTransitionInput
) {
    const input = moderationCaseTransitionSchema.parse(rawInput);
    if (
        [ModerationCaseStatus.RESOLVED, ModerationCaseStatus.DISMISSED].includes(
            input.status as
                | typeof ModerationCaseStatus.RESOLVED
                | typeof ModerationCaseStatus.DISMISSED
        ) &&
        !input.note
    ) {
        throw new Error("A resolution or dismissal reason is required.");
    }

    return prisma.$transaction(async (tx) => {
        const [moderationCase, config] = await Promise.all([
            tx.moderationCase.findUnique({
                where: { id: input.caseId },
            }),
            tx.moderationConfig.upsert({
                where: { id: "global" },
                create: { id: "global" },
                update: {},
            }),
        ]);
        if (!moderationCase) throw new Error("Moderation case not found.");

        const terminal =
            input.status === ModerationCaseStatus.RESOLVED ||
            input.status === ModerationCaseStatus.DISMISSED;
        const reopening =
            input.status === ModerationCaseStatus.OPEN &&
            (moderationCase.status === ModerationCaseStatus.RESOLVED ||
                moderationCase.status === ModerationCaseStatus.DISMISSED);
        const threshold =
            moderationCase.targetType === ModerationTargetType.QUESTION
                ? config.questionReportThreshold
                : config.paperReportThreshold;
        const activeKey = reopening
            ? moderationCase.targetType === ModerationTargetType.QUESTION
                ? buildQuestionCaseKey(
                      moderationCase.questionId!,
                      moderationCase.snapshotHash!
                  )
                : buildPaperCaseKey(
                      moderationCase.paperId!,
                      moderationCase.snapshotHash!
                  )
            : undefined;
        const action =
            input.status === ModerationCaseStatus.IN_REVIEW
                ? ModerationActionType.MARKED_IN_REVIEW
                : input.status === ModerationCaseStatus.RESOLVED
                  ? ModerationActionType.RESOLVED
                  : input.status === ModerationCaseStatus.DISMISSED
                    ? ModerationActionType.DISMISSED
                    : ModerationActionType.REOPENED;

        const updated = await tx.moderationCase.update({
            where: { id: moderationCase.id },
            data: {
                status: input.status,
                assignedToId:
                    input.status === ModerationCaseStatus.IN_REVIEW
                        ? actorId
                        : undefined,
                activeKey: terminal ? null : activeKey,
                resolutionNote: terminal ? input.note : null,
                resolvedAt: terminal ? new Date() : null,
                isEscalated: reopening
                    ? shouldEscalate(
                          moderationCase.uniqueReporterCount,
                          threshold
                      )
                    : undefined,
                actions: {
                    create: {
                        actorId,
                        action,
                        note: input.note || null,
                        metadata: {
                            previousStatus: moderationCase.status,
                            nextStatus: input.status,
                        },
                    },
                },
            },
        });

        return updated;
    });
}

export async function assignModerationCase(
    actorId: string,
    rawInput: ModerationCaseAssignmentInput
) {
    const input = moderationCaseAssignmentSchema.parse(rawInput);
    if (input.assigneeId) {
        const assignee = await prisma.user.findFirst({
            where: { id: input.assigneeId, role: "ADMIN" },
            select: { id: true },
        });
        if (!assignee) throw new Error("Selected administrator was not found.");
    }
    return prisma.moderationCase.update({
        where: { id: input.caseId },
        data: {
            assignedToId: input.assigneeId,
            actions: {
                create: {
                    actorId,
                    action: ModerationActionType.ASSIGNED,
                    metadata: { assigneeId: input.assigneeId },
                    note: input.assigneeId
                        ? "Case assignment changed."
                        : "Case unassigned.",
                },
            },
        },
    });
}

export async function mergeModerationCases(
    actorId: string,
    rawInput: ModerationCaseMergeInput
) {
    const input = moderationCaseMergeSchema.parse(rawInput);
    if (input.sourceCaseId === input.targetCaseId) {
        throw new Error("A case cannot be merged into itself.");
    }

    return prisma.$transaction(
        async (tx) => {
            const [source, target, config] = await Promise.all([
                tx.moderationCase.findUnique({
                    where: { id: input.sourceCaseId },
                    include: { reports: true },
                }),
                tx.moderationCase.findUnique({
                    where: { id: input.targetCaseId },
                    include: { reports: true },
                }),
                tx.moderationConfig.upsert({
                    where: { id: "global" },
                    create: { id: "global" },
                    update: {},
                }),
            ]);
            if (!source || !target) throw new Error("Moderation case not found.");
            if (
                source.targetType !== target.targetType ||
                source.questionId !== target.questionId ||
                source.paperId !== target.paperId ||
                source.snapshotHash !== target.snapshotHash
            ) {
                throw new Error(
                    "Only cases for the same content revision can be merged."
                );
            }

            const targetByReporter = new Map(
                target.reports.map((report) => [report.reporterId, report])
            );
            const now = new Date();
            for (const sourceReport of source.reports) {
                const targetReport = targetByReporter.get(
                    sourceReport.reporterId
                );
                if (!targetReport) {
                    await tx.contentReport.update({
                        where: { id: sourceReport.id },
                        data: { caseId: target.id },
                    });
                    continue;
                }
                if (targetReport.withdrawnAt && !sourceReport.withdrawnAt) {
                    await tx.contentReport.update({
                        where: { id: targetReport.id },
                        data: {
                            category: sourceReport.category,
                            source: sourceReport.source,
                            comment: sourceReport.comment,
                            context: sourceReport.context ?? undefined,
                            sessionId: sourceReport.sessionId,
                            withdrawnAt: null,
                        },
                    });
                }
                await tx.contentReport.update({
                    where: { id: sourceReport.id },
                    data: { withdrawnAt: sourceReport.withdrawnAt ?? now },
                });
            }

            const uniqueReporterCount = await tx.contentReport.count({
                where: { caseId: target.id, withdrawnAt: null },
            });
            const threshold =
                target.targetType === ModerationTargetType.QUESTION
                    ? config.questionReportThreshold
                    : config.paperReportThreshold;
            await tx.moderationCase.update({
                where: { id: target.id },
                data: {
                    uniqueReporterCount,
                    isEscalated: shouldEscalate(
                        uniqueReporterCount,
                        threshold
                    ),
                    actions: {
                        create: {
                            actorId,
                            action: ModerationActionType.MERGED,
                            note: `Merged case ${source.id} into this case.`,
                            metadata: { sourceCaseId: source.id },
                        },
                    },
                },
            });
            await tx.moderationCase.update({
                where: { id: source.id },
                data: {
                    status: ModerationCaseStatus.DISMISSED,
                    activeKey: null,
                    uniqueReporterCount: 0,
                    isEscalated: false,
                    resolvedAt: now,
                    resolutionNote: `Merged into case ${target.id}.`,
                    actions: {
                        create: {
                            actorId,
                            action: ModerationActionType.MERGED,
                            note: `Merged into case ${target.id}.`,
                            metadata: { targetCaseId: target.id },
                        },
                    },
                },
            });

            return { sourceCaseId: source.id, targetCaseId: target.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
}
