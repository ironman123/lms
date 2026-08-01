// app/(main)/actions/question-actions.ts
"use server";

import prisma from "@/lib/prisma";
import {
    ModerationActionType,
    ModerationCaseStatus,
    Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { questionSchema, QuestionFormInput } from "@/types/question";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateKey, invalidateTag } from "@/lib/cache";
import {
    buildQuestionData,
    type ResolvedQuestionTopic,
    type ValidatedQuestion,
} from "@/lib/question-persistence";

async function resolveQuestionTopic(
    tx: Prisma.TransactionClient,
    paperId: string,
    question: ValidatedQuestion
): Promise<ResolvedQuestionTopic> {
    if (!question.syllabusEntryId) {
        return {
            syllabusEntryId: null,
            topicId: null,
            topicPath: question.topicPath?.trim() || null,
        };
    }
    const entry = await tx.examSyllabusEntry.findUnique({
        where: { id: question.syllabusEntryId },
        select: { id: true, examId: true, topicId: true, topicPath: true },
    });
    if (!entry) throw new Error("The selected syllabus topic no longer exists.");
    const linkedExamCount = await tx.examQuestionPaperLink.count({
        where: { paperId },
    });
    if (linkedExamCount > 0) {
        const isAllowed = await tx.examQuestionPaperLink.findUnique({
            where: { examId_paperId: { examId: entry.examId, paperId } },
            select: { id: true },
        });
        if (!isAllowed) {
            throw new Error("Select a topic belonging to one of this paper's exams.");
        }
    }
    return {
        syllabusEntryId: entry.id,
        topicId: entry.topicId,
        topicPath: entry.topicPath,
    };
}

async function revalidateQuestionPaths(examSlug: string, paperId?: string) {
    await Promise.all([
        invalidateTag("exams"),
        invalidateTag("papers"),
        ...(paperId ? [invalidateKey(`paper:${paperId}`)] : []),
    ]);
    if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
    revalidatePath("/library/paper");
    if (paperId) revalidatePath(`/library/paper/${paperId}`);
}

export async function createQuestion(
    paperId: string,
    examSlug: string,
    data: QuestionFormInput
) {
    await requireAdmin();
    const validated = questionSchema.parse(data);
    let savedQuestion: { id: string; paperRevision: number } | undefined;
    try
    {
        const question = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw(
                Prisma.sql`SELECT "id" FROM "QuestionPaper" WHERE "id" = ${paperId} FOR UPDATE`
            );
            const highestPosition = await tx.question.aggregate({
                where: { paperId },
                _max: { position: true },
            });
            const resolvedTopic = await resolveQuestionTopic(tx, paperId, validated);
            const created = await tx.question.create({
                data: {
                    ...buildQuestionData(validated, resolvedTopic),
                    paperId,
                    position: (highestPosition._max.position ?? -1) + 1,
                },
                select: { id: true },
            });
            const paper = await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 }, status: "DRAFT" },
                select: { contentRevision: true },
            });
            return { id: created.id, paperRevision: paper.contentRevision };
        });
        savedQuestion = question;
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true, ...savedQuestion! };
}

export async function updateQuestion(
    questionId: string,
    paperId: string,
    examSlug: string,
    data: QuestionFormInput,
    moderationCaseId?: string
) {
    const admin = await requireAdmin();
    const validated = questionSchema.parse(data);
    let paperRevision: number | undefined;
    try
    {
        paperRevision = await prisma.$transaction(async (tx) => {
            const resolvedTopic = await resolveQuestionTopic(tx, paperId, validated);
            const question = await tx.question.update({
                where: { id: questionId, paperId },
                data: {
                    ...buildQuestionData(validated, resolvedTopic),
                    contentRevision: { increment: 1 },
                    isArchived: false,
                    archivedAt: null,
                    archiveReason: null,
                },
                select: { contentRevision: true },
            });
            const paper = await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 }, status: "DRAFT" },
                select: { contentRevision: true },
            });
            const activeCases = await tx.moderationCase.findMany({
                where: {
                    questionId,
                    status: {
                        in: [
                            ModerationCaseStatus.OPEN,
                            ModerationCaseStatus.IN_REVIEW,
                        ],
                    },
                },
                select: { id: true },
            });
            if (activeCases.length > 0)
            {
                await tx.moderationAction.createMany({
                    data: activeCases.map((moderationCase) => ({
                        caseId: moderationCase.id,
                        actorId: admin.id,
                        action: ModerationActionType.CONTENT_EDITED,
                        note: `Question content updated to revision ${question.contentRevision}.`,
                        metadata: {
                            questionRevision: question.contentRevision,
                        },
                    })),
                });
            }
            if (moderationCaseId)
            {
                const linkedCase = await tx.moderationCase.findFirst({
                    where: {
                        id: moderationCaseId,
                        questionId,
                        status: {
                            in: [
                                ModerationCaseStatus.OPEN,
                                ModerationCaseStatus.IN_REVIEW,
                            ],
                        },
                    },
                    select: { id: true },
                });
                if (!linkedCase)
                {
                    throw new Error(
                        "The moderation case does not match this question or is already closed."
                    );
                }
                await tx.moderationCase.update({
                    where: { id: linkedCase.id },
                    data: {
                        status: ModerationCaseStatus.RESOLVED,
                        activeKey: null,
                        resolvedAt: new Date(),
                        resolutionNote:
                            "Question corrected through the moderation workflow.",
                        actions: {
                            create: {
                                actorId: admin.id,
                                action: ModerationActionType.RESOLVED,
                                note: `Question corrected in revision ${question.contentRevision}.`,
                            },
                        },
                    },
                });
            }
            return paper.contentRevision;
        });
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true, paperRevision: paperRevision! };
}

export async function deleteQuestion(
    questionId: string,
    paperId: string,
    examSlug: string
) {
    const admin = await requireAdmin();
    let paperRevision: number | undefined;
    try
    {
        // Keep the row because active and completed sessions can reference it.
        // New attempts and the paper builder exclude archived questions.
        paperRevision = await prisma.$transaction(async (tx) => {
            const archivedAt = new Date();
            await tx.question.update({
                where: { id: questionId, paperId },
                data: {
                    isArchived: true,
                    archivedAt,
                    archiveReason: "ADMIN_DELETED",
                    contentRevision: { increment: 1 },
                },
            });
            const paper = await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 }, status: "DRAFT" },
                select: { contentRevision: true },
            });
            const activeCases = await tx.moderationCase.findMany({
                where: {
                    questionId,
                    status: {
                        in: [
                            ModerationCaseStatus.OPEN,
                            ModerationCaseStatus.IN_REVIEW,
                        ],
                    },
                },
                select: { id: true },
            });
            if (activeCases.length > 0)
            {
                const caseIds = activeCases.map(
                    (moderationCase) => moderationCase.id
                );
                await tx.moderationCase.updateMany({
                    where: { id: { in: caseIds } },
                    data: {
                        status: ModerationCaseStatus.RESOLVED,
                        activeKey: null,
                        resolvedAt: archivedAt,
                        resolutionNote:
                            "Question archived by an administrator.",
                    },
                });
                await tx.moderationAction.createMany({
                    data: activeCases.flatMap((moderationCase) => [
                        {
                            caseId: moderationCase.id,
                            actorId: admin.id,
                            action: ModerationActionType.CONTENT_ARCHIVED,
                            note: "Question archived from future sessions.",
                        },
                        {
                            caseId: moderationCase.id,
                            actorId: admin.id,
                            action: ModerationActionType.RESOLVED,
                            note: "Question archived by an administrator.",
                        },
                    ]),
                });
            }
            return paper.contentRevision;
        });
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true, paperRevision: paperRevision! };
}
