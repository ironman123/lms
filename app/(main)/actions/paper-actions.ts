// app/(main)/actions/paper-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { paperSchema, PaperFormInput } from "@/types/paper";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateTag, invalidateKey } from "@/lib/cache";
import {
    ModerationActionType,
    ModerationCaseStatus,
} from "@prisma/client";

export async function linkPaperToExam(paperId: string, examId: string) {
    await requireAdmin();
    if (!paperId || !examId) throw new Error("Invalid IDs");
    try
    {
        await prisma.$transaction([
            prisma.examQuestionPaperLink.upsert({
                where: { examId_paperId: { examId, paperId } },
                update: {},
                create: { examId, paperId },
            }),
            prisma.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 } },
            }),
        ]);
        await invalidateTag("exams");
        await invalidateKey(`paper:${paperId}`);
    } catch (error)
    {
        handlePrismaError(error);
    }
    revalidatePath(`/library/exam/${examId}`);
}

export async function unlinkPaperFromExam(paperId: string, examId: string) {
    await requireAdmin();
    if (!paperId || !examId) throw new Error("Invalid IDs");
    try
    {
        await prisma.$transaction([
            prisma.examQuestionPaperLink.delete({
                where: { examId_paperId: { examId, paperId } },
            }),
            prisma.questionPaper.update({
                where: { id: paperId },
                data: { contentRevision: { increment: 1 } },
            }),
        ]);
        await invalidateTag("exams");
        await invalidateKey(`paper:${paperId}`);
    } catch (error)
    {
        handlePrismaError(error);
    }
    revalidatePath(`/library/exam/${examId}`);
}

export async function createQuestionPaper(data: PaperFormInput, examSlug: string) {
    await requireAdmin();
    try
    {
        const validated = paperSchema.parse(data);
        const paper = await prisma.questionPaper.create({
            data: {
                title: validated.title,
                year: validated.year || null,
                type: validated.type,
                ...(validated.examIds.length > 0 && {
                    examQuestionPaperLinks: {
                        create: validated.examIds.map((id: string) => ({ examId: id })),
                    },
                }),
            },
        });

        await invalidateTag("exams");
        if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
        return { success: true, id: paper.id, title: paper.title, year: paper.year };
    } catch (error: unknown)
    {
        console.error("❌ CREATE PAPER ERROR:", error);
        handlePrismaError(error);
    }
}

export async function updateQuestionPaper(
    paperId: string,
    data: PaperFormInput,
    examSlug: string
) {
    const admin = await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required for update");
    const validated = paperSchema.parse(data);

    await prisma.$transaction(async (tx) => {
        await tx.questionPaper.update({
            where: { id: paperId },
            data: {
                title: validated.title,
                year: validated.year ?? null,
                type: validated.type,
                contentRevision: { increment: 1 },
                isArchived: false,
                archivedAt: null,
                archiveReason: null,
                questions: {
                    updateMany: {
                        where: { archiveReason: "PAPER_ARCHIVED" },
                        data: {
                            isArchived: false,
                            archivedAt: null,
                            archiveReason: null,
                            contentRevision: { increment: 1 },
                        },
                    },
                },
            },
        });
        await tx.examQuestionPaperLink.deleteMany({ where: { paperId } });
        if (validated.examIds?.length > 0) {
            await tx.examQuestionPaperLink.createMany({
                data: validated.examIds.map((examId: string) => ({
                    examId,
                    paperId,
                })),
                skipDuplicates: true,
            });
        }
        const activeCases = await tx.moderationCase.findMany({
            where: {
                paperId,
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
                    note: "Paper details or exam links were updated.",
                })),
            });
        }
    });

    await invalidateTag("exams");
    await invalidateKey(`paper:${paperId}`);
    revalidatePath(`/library/exam/${examSlug}`);
}

export async function deleteQuestionPaper(paperId: string, examSlug: string) {
    const admin = await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required");
    await prisma.$transaction(async (tx) => {
        const archivedAt = new Date();
        const questions = await tx.question.findMany({
            where: { paperId },
            select: { id: true },
        });
        const questionIds = questions.map((question) => question.id);
        const activeCases = await tx.moderationCase.findMany({
            where: {
                OR: [
                    { paperId },
                    ...(questionIds.length > 0
                        ? [{ questionId: { in: questionIds } }]
                        : []),
                ],
                status: {
                    in: [
                        ModerationCaseStatus.OPEN,
                        ModerationCaseStatus.IN_REVIEW,
                    ],
                },
            },
            select: { id: true },
        });

        await tx.questionPaper.update({
            where: { id: paperId },
            data: {
                isArchived: true,
                archivedAt,
                archiveReason: "ADMIN_DELETED",
                contentRevision: { increment: 1 },
                questions: {
                    updateMany: {
                        where: { isArchived: false },
                        data: {
                            isArchived: true,
                            archivedAt,
                            archiveReason: "PAPER_ARCHIVED",
                            contentRevision: { increment: 1 },
                        },
                    },
                },
            },
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
                    resolutionNote: "Paper archived by an administrator.",
                },
            });
            await tx.moderationAction.createMany({
                data: activeCases.flatMap((moderationCase) => [
                    {
                        caseId: moderationCase.id,
                        actorId: admin.id,
                        action: ModerationActionType.CONTENT_ARCHIVED,
                        note: "Paper archived from future sessions.",
                    },
                    {
                        caseId: moderationCase.id,
                        actorId: admin.id,
                        action: ModerationActionType.RESOLVED,
                        note: "Paper archived by an administrator.",
                    },
                ]),
            });
        }
    });
    await invalidateTag("exams");
    await invalidateKey(`paper:${paperId}`);

    if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
    revalidatePath("/library/paper");
    return { success: true };
}

export async function restoreQuestionPaper(paperId: string) {
    await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required");
    await prisma.questionPaper.update({
        where: { id: paperId },
        data: {
            isArchived: false,
            archivedAt: null,
            archiveReason: null,
            contentRevision: { increment: 1 },
            questions: {
                updateMany: {
                    where: { archiveReason: "PAPER_ARCHIVED" },
                    data: {
                        isArchived: false,
                        archivedAt: null,
                        archiveReason: null,
                        contentRevision: { increment: 1 },
                    },
                },
            },
        },
    });
    await invalidateTag("exams");
    await invalidateTag("papers");
    await invalidateKey(`paper:${paperId}`);
    revalidatePath("/admin/papers/archived");
    revalidatePath("/library/paper");
    return { success: true };
}

export async function restoreQuestionPaperFromForm(formData: FormData) {
    const paperId = formData.get("paperId");
    if (typeof paperId !== "string") throw new Error("Paper ID is required");
    await restoreQuestionPaper(paperId);
}

export async function getExamSyllabusEntries(examId: string) {
    await requireAdmin();
    if (!examId) throw new Error("Exam ID is required");
    return prisma.examSyllabusEntry.findMany({
        where: { examId },
        select: {
            id: true,
            topicPath: true,
            categoryId: true,
            category: { select: { name: true } },
            topicId: true,
        },
        orderBy: { topicPath: "asc" },
    });
}
