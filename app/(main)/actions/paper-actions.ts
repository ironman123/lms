"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Zod Schema
const paperSchema = z.object({
    title: z.string().min(3, "Title is required"),
    year: z.coerce.number().nullable().optional(), // If null = Mock, If number = PYQ
    examId: z.string().min(1, "Exam ID is required"),
});

export async function createQuestionPaper(data: any, examSlug: string) {
    const validated = paperSchema.parse(data);

    const paper = await prisma.questionPaper.create({
        data: {
            title: validated.title,
            year: validated.year || null,
            examId: validated.examId,
        }
    });

    revalidateTag("exams");
    revalidatePath(`/library/exam/${examSlug}`);

    // Redirect straight to the builder so they can start adding questions
    redirect(`/library/exam/${examSlug}/paper/${paper.id}`);
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