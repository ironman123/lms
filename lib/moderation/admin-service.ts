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
