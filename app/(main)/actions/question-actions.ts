// app/(main)/actions/question-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { questionSchema, QuestionFormInput } from "@/types/question";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateKey, invalidateTag } from "@/lib/cache";

function buildQuestionData(validated: ReturnType<typeof questionSchema.parse>) {
    const isOptionsType = validated.type === "MCQ" || validated.type === "MSQ";
    const isNumerical = validated.type === "NUMERICAL";
    const isSubjective = validated.type === "SUBJECTIVE";

    return {
        content: validated.content,
        type: validated.type,
        difficulty: validated.difficulty,
        marks: validated.marks,
        negativeMarks: validated.negativeMarks,
        explanation: validated.explanation ?? null,
        topicPath: validated.topicPath ?? null,
        topicId: validated.topicId ?? null,
        options: isOptionsType
            ? (validated.options as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctOptions: isOptionsType ? validated.correctOptions : [],
        exactAnswer: isNumerical ? (validated.exactAnswer ?? null) : null,
        answerMin: isNumerical ? (validated.answerMin ?? null) : null,
        answerMax: isNumerical ? (validated.answerMax ?? null) : null,
        modelAnswer: isSubjective ? (validated.modelAnswer ?? null) : null,
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
        const question = await prisma.question.create({
            data: { ...buildQuestionData(validated), paperId },
            select: { id: true },
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
    data: QuestionFormInput
) {
    await requireAdmin();
    const validated = questionSchema.parse(data);
    try
    {
        await prisma.question.update({
            where: { id: questionId, paperId },
            data: {
                ...buildQuestionData(validated),
                isArchived: false,
                archivedAt: null,
                archiveReason: null,
            },
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
    await requireAdmin();
    try
    {
        // Keep the row because active and completed sessions can reference it.
        // New attempts and the paper builder exclude archived questions.
        await prisma.question.update({
            where: { id: questionId, paperId },
            data: {
                isArchived: true,
                archivedAt: new Date(),
                archiveReason: "ADMIN_DELETED",
            },
        });
    } catch (error)
    {
        handlePrismaError(error);
    }
    await revalidateQuestionPaths(examSlug, paperId);
    return { success: true };
}
