// app/(main)/actions/paper-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { paperSchema, PaperFormInput } from "@/types/paper";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateTag, invalidateKey } from "@/lib/cache";

export async function linkPaperToExam(paperId: string, examId: string) {
    await requireAdmin();
    if (!paperId || !examId) throw new Error("Invalid IDs");
    try
    {
        await prisma.examQuestionPaperLink.upsert({
            where: { examId_paperId: { examId, paperId } },
            update: {},
            create: { examId, paperId },
        });
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
        await prisma.examQuestionPaperLink.delete({
            where: { examId_paperId: { examId, paperId } },
        });
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
    } catch (error: any)
    {
        console.error("❌ CREATE PAPER ERROR:", error);
        handlePrismaError(error);
        throw new Error(error.message || "Failed to create paper in database");
    }
}

export async function updateQuestionPaper(
    paperId: string,
    data: PaperFormInput,
    examSlug: string
) {
    await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required for update");
    const validated = paperSchema.parse(data);

    await prisma.$transaction([
        prisma.questionPaper.update({
            where: { id: paperId },
            data: { title: validated.title, year: validated.year ?? null, type: validated.type },
        }),
        prisma.examQuestionPaperLink.deleteMany({ where: { paperId } }),
        ...(validated.examIds?.length > 0
            ? [
                prisma.examQuestionPaperLink.createMany({
                    data: validated.examIds.map((examId: string) => ({ examId, paperId })),
                    skipDuplicates: true,
                }),
            ]
            : []),
    ]);

    await invalidateTag("exams");
    await invalidateKey(`paper:${paperId}`);
    revalidatePath(`/library/exam/${examSlug}`);
}

export async function deleteQuestionPaper(paperId: string, examSlug: string) {
    await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required");
    await prisma.questionPaper.delete({ where: { id: paperId } });
    await invalidateTag("exams");
    await invalidateKey(`paper:${paperId}`);

    if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
    revalidatePath("/library/paper");
    return { success: true };
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