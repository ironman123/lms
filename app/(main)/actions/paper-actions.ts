"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { paperSchema } from "@/types/paper";

// Zod Schema
// const paperSchema = z.object({
//     title: z.string().min(3, "Title is required"),
//     year: z.coerce.number().nullable().optional(), // If null = Mock, If number = PYQ
//     examId: z.string().nullable().optional(),
//     //examId: z.string().min(1, "Exam ID is required"),
// });

export async function createQuestionPaper(data: any, examSlug: string) {
    try
    {
        const validated = paperSchema.parse(data);

        const paper = await prisma.questionPaper.create({
            data: {
                title: validated.title,
                year: validated.year || null,
                examId: validated.examId ?? null,
            }
        });

        revalidateTag("exams");
        revalidatePath(`/library/exam/${examSlug}`);

        // Return the ID so the client can redirect us
        return { success: true, id: paper.id };

    } catch (error: any)
    {
        // 🔥 THIS WILL PRINT THE EXACT CAUSE OF THE 500 ERROR IN YOUR TERMINAL
        console.error("❌ CREATE PAPER ERROR:", error);
        throw new Error(error.message || "Failed to create paper in database");
    }
}

export async function updateQuestionPaper(paperId: string, data: any, examSlug: string) {
    const validated = paperSchema.parse(data);

    await prisma.questionPaper.update({
        where: { id: paperId },
        data: {
            title: validated.title,
            year: validated.year || null,
        }
    });

    revalidateTag("exams");
    revalidatePath(`/library/exam/${examSlug}`);
    redirect(`/library/exam/${examSlug}`);
}

export async function deleteQuestionPaper(paperId: string, examSlug: string) {
    // Because of onDelete: Cascade in your schema, deleting the paper 
    // will automatically delete all associated questions and options!
    await prisma.questionPaper.delete({
        where: { id: paperId }
    });

    revalidateTag("exams");
    revalidatePath(`/library/exam/${examSlug}`);
    return { success: true };
}

export async function getExamSyllabusEntries(examId: string) {
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