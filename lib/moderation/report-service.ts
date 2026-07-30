import "server-only";

import {
    ModerationActionType,
    Prisma,
    ReportSource,
    SessionStatus,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    createQuestionSetSnapshot,
    parseQuestionSetSnapshot,
    type SessionQuestionSnapshot,
} from "@/lib/exam-results";
import {
    buildPaperCaseKey,
    buildQuestionCaseKey,
    hashModerationSnapshot,
    shouldEscalate,
} from "@/lib/moderation/report-policy";
import {
    contentReportInputSchema,
    type ContentReportInput,
} from "@/lib/moderation/schemas";

export class ModerationReportError extends Error {
    constructor(
        public readonly code:
            | "INVALID_REPORT"
            | "NOT_FOUND"
            | "FORBIDDEN"
            | "RATE_LIMITED",
        message: string
    ) {
        super(message);
        this.name = "ModerationReportError";
    }
}

const DEFAULT_CONFIG = {
    questionReportThreshold: 3,
    paperReportThreshold: 3,
    reportLimitPerHour: 10,
    reportLimitPerDay: 30,
    maxCommentLength: 1000,
} as const;

type ReportTarget = {
    activeKey: string;
    targetType: "QUESTION" | "PAPER";
    questionId: string | null;
    paperId: string | null;
    questionRevision: number | null;
    paperRevision: number | null;
    snapshotHash: string | null;
    targetSnapshot: Prisma.InputJsonValue;
    context: Prisma.InputJsonValue;
    threshold: number;
    sessionId: string | null;
};

function asSnapshotRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const snapshot = value as Record<string, unknown>;
    return typeof snapshot.content === "string" ? snapshot : null;
}

async function getConfig() {
    return prisma.moderationConfig.upsert({
        where: { id: "global" },
        create: { id: "global", ...DEFAULT_CONFIG },
        update: {},
    });
}

async function enforcePersistentLimits(
    reporterId: string,
    config: Awaited<ReturnType<typeof getConfig>>
) {
    const now = Date.now();
    const [hourCount, dayCount] = await Promise.all([
        prisma.contentReport.count({
            where: {
                reporterId,
                createdAt: { gte: new Date(now - 60 * 60 * 1000) },
            },
        }),
        prisma.contentReport.count({
            where: {
                reporterId,
                createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
            },
        }),
    ]);

    if (
        hourCount >= config.reportLimitPerHour ||
        dayCount >= config.reportLimitPerDay
    ) {
        throw new ModerationReportError(
            "RATE_LIMITED",
            "You have submitted several reports recently. Please try again later."
        );
    }
}

async function resolveQuestionTarget(
    reporterId: string,
    input: Extract<ContentReportInput, { targetType: "QUESTION" }>,
    threshold: number
): Promise<ReportTarget> {
    const session = await prisma.testSession.findFirst({
        where: { id: input.sessionId, userId: reporterId },
        select: {
            id: true,
            paperId: true,
            mode: true,
            status: true,
            questionSetSnapshot: true,
            interactions: {
                where: { questionId: input.questionId },
                select: { questionSnapshot: true },
                take: 1,
            },
        },
    });
    if (!session) {
        throw new ModerationReportError(
            "FORBIDDEN",
            "This question is not part of one of your sessions."
        );
    }

    const validStatuses: SessionStatus[] =
        input.source === ReportSource.ACTIVE_SESSION
            ? [SessionStatus.ACTIVE, SessionStatus.PAUSED]
            : [SessionStatus.COMPLETED];
    if (!validStatuses.includes(session.status)) {
        throw new ModerationReportError(
            "INVALID_REPORT",
            "This report source does not match the session state."
        );
    }

    const frozenQuestion = parseQuestionSetSnapshot(
        session.questionSetSnapshot
    )?.find((question) => question.id === input.questionId);
    const interactionSnapshot = asSnapshotRecord(
        session.interactions[0]?.questionSnapshot
    );

    let snapshot: SessionQuestionSnapshot | Record<string, unknown> | null =
        frozenQuestion ??
        (interactionSnapshot
            ? { id: input.questionId, ...interactionSnapshot }
            : null);

    const currentQuestion = await prisma.question.findFirst({
        where: { id: input.questionId, paperId: session.paperId },
    });
    if (!currentQuestion) {
        throw new ModerationReportError(
            "NOT_FOUND",
            "The reported question no longer exists."
        );
    }

    if (!snapshot) {
        snapshot = createQuestionSetSnapshot([currentQuestion])[0];
    }

    const snapshotHash = hashModerationSnapshot(snapshot);
    const questionRevision =
        typeof snapshot.contentRevision === "number"
            ? snapshot.contentRevision
            : 1;

    return {
        activeKey: buildQuestionCaseKey(input.questionId, snapshotHash),
        targetType: "QUESTION",
        questionId: input.questionId,
        paperId: null,
        questionRevision,
        paperRevision: null,
        snapshotHash,
        targetSnapshot: snapshot as Prisma.InputJsonValue,
        context: {
            paperId: session.paperId,
            sessionMode: session.mode,
            sessionStatus: session.status,
        },
        threshold,
        sessionId: session.id,
    };
}

async function resolvePaperTarget(
    input: Extract<ContentReportInput, { targetType: "PAPER" }>,
    threshold: number
): Promise<ReportTarget> {
    const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
            id: true,
            title: true,
            type: true,
            year: true,
            contentRevision: true,
            _count: { select: { questions: true } },
            examQuestionPaperLinks: {
                select: { exam: { select: { id: true, name: true } } },
            },
        },
    });
    if (!paper) {
        throw new ModerationReportError(
            "NOT_FOUND",
            "The reported paper no longer exists."
        );
    }

    const snapshot = {
        id: paper.id,
        title: paper.title,
        type: paper.type,
        year: paper.year,
        contentRevision: paper.contentRevision,
        questionCount: paper._count.questions,
        exams: paper.examQuestionPaperLinks.map(({ exam }) => exam),
    };
    const snapshotHash = hashModerationSnapshot(snapshot);

    return {
        activeKey: buildPaperCaseKey(paper.id, snapshotHash),
        targetType: "PAPER",
        questionId: null,
        paperId: paper.id,
        questionRevision: null,
        paperRevision: paper.contentRevision,
        snapshotHash,
        targetSnapshot: snapshot,
        context: { paperId: paper.id },
        threshold,
        sessionId: null,
    };
}

async function persistReport(
    reporterId: string,
    input: ContentReportInput,
    target: ReportTarget
) {
    const execute = () =>
        prisma.$transaction(
            async (tx) => {
                const moderationCase = await tx.moderationCase.upsert({
                    where: { activeKey: target.activeKey },
                    create: {
                        targetType: target.targetType,
                        questionId: target.questionId,
                        paperId: target.paperId,
                        questionRevision: target.questionRevision,
                        paperRevision: target.paperRevision,
                        snapshotHash: target.snapshotHash,
                        targetSnapshot: target.targetSnapshot,
                        activeKey: target.activeKey,
                        actions: {
                            create: {
                                action: ModerationActionType.CREATED,
                                metadata: {
                                    source: input.source,
                                    threshold: target.threshold,
                                },
                            },
                        },
                    },
                    update: {},
                });

                const report = await tx.contentReport.upsert({
                    where: {
                        caseId_reporterId: {
                            caseId: moderationCase.id,
                            reporterId,
                        },
                    },
                    create: {
                        caseId: moderationCase.id,
                        reporterId,
                        sessionId: target.sessionId,
                        category: input.category,
                        source: input.source,
                        comment: input.comment || null,
                        context: target.context,
                    },
                    update: {
                        sessionId: target.sessionId,
                        category: input.category,
                        source: input.source,
                        comment: input.comment || null,
                        context: target.context,
                    },
                    select: { id: true },
                });

                const uniqueReporterCount = await tx.contentReport.count({
                    where: { caseId: moderationCase.id },
                });
                const escalated = shouldEscalate(
                    uniqueReporterCount,
                    target.threshold
                );
                const newlyEscalated = escalated && !moderationCase.isEscalated;

                const updatedCase = await tx.moderationCase.update({
                    where: { id: moderationCase.id },
                    data: {
                        uniqueReporterCount,
                        isEscalated: escalated,
                        escalatedAt: newlyEscalated ? new Date() : undefined,
                    },
                    select: {
                        id: true,
                        status: true,
                        uniqueReporterCount: true,
                        isEscalated: true,
                    },
                });

                if (newlyEscalated) {
                    await tx.moderationAction.create({
                        data: {
                            caseId: moderationCase.id,
                            action: ModerationActionType.ESCALATED,
                            metadata: {
                                threshold: target.threshold,
                                uniqueReporterCount,
                            },
                        },
                    });
                }

                return {
                    reportId: report.id,
                    caseId: updatedCase.id,
                    status: updatedCase.status,
                    uniqueReporterCount: updatedCase.uniqueReporterCount,
                    escalated: updatedCase.isEscalated,
                };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await execute();
        } catch (error) {
            const retryable =
                error instanceof Prisma.PrismaClientKnownRequestError &&
                (error.code === "P2002" || error.code === "P2034");
            if (!retryable || attempt === 2) throw error;
        }
    }
    throw new Error("Unable to persist moderation report.");
}

export async function createOrUpdateContentReport(
    reporterId: string,
    rawInput: unknown
) {
    const parsed = contentReportInputSchema.safeParse(rawInput);
    if (!parsed.success) {
        throw new ModerationReportError(
            "INVALID_REPORT",
            parsed.error.issues[0]?.message ?? "Invalid report."
        );
    }
    const input = parsed.data;
    const config = await getConfig();
    if (input.comment.length > config.maxCommentLength) {
        throw new ModerationReportError(
            "INVALID_REPORT",
            `Comments are limited to ${config.maxCommentLength} characters.`
        );
    }

    const target =
        input.targetType === "QUESTION"
            ? await resolveQuestionTarget(
                  reporterId,
                  input,
                  config.questionReportThreshold
              )
            : await resolvePaperTarget(input, config.paperReportThreshold);
    const existingReport = await prisma.moderationCase.findUnique({
        where: { activeKey: target.activeKey },
        select: {
            reports: {
                where: { reporterId },
                select: { id: true },
                take: 1,
            },
        },
    });
    if (!existingReport?.reports.length) {
        await enforcePersistentLimits(reporterId, config);
    }

    return persistReport(reporterId, input, target);
}
