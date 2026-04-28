//app/(main)/actions/paper-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { paperSchema, PaperFormInput } from "@/types/paper";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";

// Link
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
    }
    catch (error)
    {
        handlePrismaError(error);
    }
    revalidatePath(`/library/exam/${examId}`);
}

// Unlink
export async function unlinkPaperFromExam(paperId: string, examId: string) {
    await requireAdmin();
    if (!paperId || !examId) throw new Error("Invalid IDs");
    try
    {
        await prisma.examQuestionPaperLink.delete({
            where: { examId_paperId: { examId, paperId } },
        });
    }
    catch (error)
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
                        create: validated.examIds.map((id: string) => ({ examId: id }))
                    }
                })
            }
        });

        revalidateTag("exams", "max");
        if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
        //revalidatePath(`/library/exam/${examSlug}`);

        // Return the ID so the client can redirect us
        return { success: true, id: paper.id, title: paper.title, year: paper.year };

    } catch (error: any)
    {
        // 🔥 THIS WILL PRINT THE EXACT CAUSE OF THE 500 ERROR IN YOUR TERMINAL
        console.error("❌ CREATE PAPER ERROR:", error);
        handlePrismaError(error);

        throw new Error(error.message || "Failed to create paper in database");
    }
}

export async function updateQuestionPaper(paperId: string, data: PaperFormInput, examSlug: string) {
    await requireAdmin();
    if (!paperId)
    {
        throw new Error("Paper ID is required for update");
    }
    const validated = paperSchema.parse(data);

    await prisma.$transaction([
        prisma.questionPaper.update({
            where: { id: paperId },
            data: {
                title: validated.title,
                year: validated.year ?? null,
                type: validated.type,
            }
        }),
        // Delete existing exam links
        prisma.examQuestionPaperLink.deleteMany({
            where: { paperId }
        }),
        // Re-create exam links
        ...(validated.examIds?.length > 0
            ? [prisma.examQuestionPaperLink.createMany({
                data: validated.examIds.map((examId: string) => ({ examId, paperId })),
                skipDuplicates: true,
            })]
            : []
        ),
    ]);

    revalidateTag("exams", "max");
    revalidatePath(`/library/exam/${examSlug}`);
    //redirect(`/library/exam/${examSlug}`);
}

export async function deleteQuestionPaper(paperId: string, examSlug: string) {
    await requireAdmin();
    if (!paperId) throw new Error("Paper ID is required");
    await prisma.questionPaper.delete({ where: { id: paperId } });
    revalidateTag("exams", "max");
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