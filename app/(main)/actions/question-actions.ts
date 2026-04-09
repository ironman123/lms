"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { questionSchema } from "@/types/question";
import { requireAdmin } from "@/lib/auth";


// ── Actions ─────────────────────────────────────────────────────────────────

export async function createQuestion(paperId: string, examSlug: string, data: any) {
    await requireAdmin();
    const validated = questionSchema.parse(data);

    // If it's not an MCQ/MSQ, we shouldn't save options to the database
    const isOptionsType = validated.type === "MCQ" || validated.type === "MSQ";

    const question = await prisma.question.create({
        data: {
            content: validated.content,
            type: validated.type,
            difficulty: validated.difficulty,
            marks: validated.marks,
            negativeMarks: validated.negativeMarks,
            explanation: validated.explanation || null,
            correctAnswer: isOptionsType ? null : (validated.correctAnswer || null),
            //topicId: validated.topicId,
            topicPath: validated.topicPath || null,
            paperId: paperId,

            // Nested write: Create options only if it's an MCQ/MSQ
            ...(isOptionsType && validated.options && validated.options.length > 0 && {
                options: {
                    create: validated.options.map(opt => ({
                        text: opt.text,
                        isCorrect: opt.isCorrect,
                    }))
                }
            })
        }
    });

    revalidateTag("exams", "max");
    revalidatePath(`/library/exam/${examSlug}`);

    return { success: true, id: question.id };
}

export async function updateQuestion(questionId: string, paperId: string, examSlug: string, data: any) {
    await requireAdmin();
    const validated = questionSchema.parse(data);
    const isOptionsType = validated.type === "MCQ" || validated.type === "MSQ";

    await prisma.question.update({
        where: { id: questionId, paperId: paperId },
        data: {
            content: validated.content,
            type: validated.type,
            difficulty: validated.difficulty,
            marks: validated.marks,
            negativeMarks: validated.negativeMarks,
            explanation: validated.explanation || null,
            correctAnswer: isOptionsType ? null : (validated.correctAnswer || null),
            //topicId: validated.topicId,
            topicPath: validated.topicPath || null,

            // Nested write trick: Delete all existing options and create the new ones.
            // This is much safer than trying to diff which options were added/removed/edited.
            options: {
                deleteMany: {}, // Wipe the old ones
                ...(isOptionsType && validated.options && {
                    create: validated.options.map(opt => ({
                        text: opt.text,
                        isCorrect: opt.isCorrect,
                    }))
                })
            }
        }
    });

    revalidateTag("exams", "max");
    revalidatePath(`/library/exam/${examSlug}`);

    return { success: true };
}

export async function deleteQuestion(questionId: string, paperId: string, examSlug: string) {
    await requireAdmin();
    // onDelete: Cascade in schema, deleting the question
    // automatically cleans up the connected Options in the database!
    await prisma.question.delete({
        where: { id: questionId, paperId: paperId }
    });

    revalidateTag("exams", "max");
    if (examSlug) revalidatePath(`/library/exam/${examSlug}`);
    revalidatePath(`/library/paper/${paperId}`);

    return { success: true };
}