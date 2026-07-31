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

function buildQuestionData(validated: ReturnType<typeof questionSchema.parse>) {
    const isOptionsType = validated.type === "MCQ" || validated.type === "MSQ";
    const isNumerical = validated.type === "NUMERICAL";
    const isSubjective = validated.type === "SUBJECTIVE";
    const isCancelled = validated.isCancelled;

    return {
        content: validated.content,
        type: validated.type,
        difficulty: validated.difficulty,
        marks: isCancelled ? 0 : validated.marks,
        negativeMarks: isCancelled ? 0 : validated.negativeMarks,
        explanation: validated.explanation ?? null,
        topicPath: validated.topicPath ?? null,
        topicId: validated.topicId ?? null,
        isCancelled,
        options: isOptionsType
            ? (validated.options as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctOptions:
            isCancelled ? [] : isOptionsType ? validated.correctOptions : [],
        exactAnswer:
            !isCancelled && isNumerical
                ? (validated.exactAnswer ?? null)
                : null,
        answerMin:
            !isCancelled && isNumerical
                ? (validated.answerMin ?? null)
                : null,
        answerMax:
            !isCancelled && isNumerical
                ? (validated.answerMax ?? null)
                : null,
        modelAnswer:
            !isCancelled && isSubjective
                ? (validated.modelAnswer ?? null)
                : null,
    };
}

async function revalidateQuestionPaths(examSlug: string, paperId?: string) {
    await invalidateTag("exams");
    if (paperId)
    {
        await invalidateKey(`paper:${paperId}`);
    }
    revalidatePath(`/library/exam/${examSlug}`);
    if (paperId) revalidatePath(`/library/paper/${paperId}`);
}

export async function createQuestion(
    paperId: string,
    examSlug: string,
    data: QuestionFormInput
) {
    await requireAdmin();
    const validated = questionSchema.parse(data);
    let questionId: string;
    try
    {
        const question = await prisma.$transaction(async (tx) => {
            const created = await tx.question.create({
                data: { ...buildQuestionData(validated), paperId },
                select: { id: true },
            });
            await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 } },
            });
            return created;
        });
        questionId = question.id;
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true, id: questionId! };
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
    try
    {
        await prisma.$transaction(async (tx) => {
            const question = await tx.question.update({
                where: { id: questionId, paperId },
                data: {
                    ...buildQuestionData(validated),
                    contentRevision: { increment: 1 },
                    isArchived: false,
                    archivedAt: null,
                    archiveReason: null,
                },
                select: { contentRevision: true },
            });
            await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 } },
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
            if (activeCases.length > 0) {
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
            if (moderationCaseId) {
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
                if (!linkedCase) {
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
        });
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true };
}

export async function deleteQuestion(
    questionId: string,
    paperId: string,
    examSlug: string
) {
    const admin = await requireAdmin();
    try
    {
        // Keep the row because active and completed sessions can reference it.
        // New attempts and the paper builder exclude archived questions.
        await prisma.$transaction(async (tx) => {
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
            await tx.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 } },
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
            if (activeCases.length > 0) {
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
        });
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true };
}
