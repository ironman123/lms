// app/(main)/actions/question-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { questionSchema, QuestionFormInput } from "@/types/question";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

        // MCQ / MSQ — store JSONB options and correctOptions indices
        options: isOptionsType
            ? (validated.options as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctOptions: isOptionsType ? validated.correctOptions : [],

        // NUMERICAL
        exactAnswer: isNumerical ? (validated.exactAnswer ?? null) : null,
        answerMin: isNumerical ? (validated.answerMin ?? null) : null,
        answerMax: isNumerical ? (validated.answerMax ?? null) : null,

        // SUBJECTIVE
        modelAnswer: isSubjective ? (validated.modelAnswer ?? null) : null,
    };
}

function revalidateQuestionPaths(examSlug: string, paperId?: string) {
    revalidateTag("exams", "max");
    revalidatePath(`/library/exam/${examSlug}`);
    if (paperId) revalidatePath(`/library/paper/${paperId}`);
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createQuestion(
    paperId: string,
    examSlug: string,
    data: QuestionFormInput
) {
    await requireAdmin();
    const validated = questionSchema.parse(data);
    try
    {
        await prisma.question.create({
            data: {
                ...buildQuestionData(validated),
                paperId,
            },
        });
    }
    catch (error)
    {
        handlePrismaError(error);
    }
    revalidateQuestionPaths(examSlug, paperId);
    return { success: true };
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
            data: buildQuestionData(validated),
        });
    }
    catch (error)
    {
        handlePrismaError(error);
    }
    revalidateQuestionPaths(examSlug, paperId);
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
        await prisma.question.delete({
            where: { id: questionId, paperId },
            // Cascade on QuestionInteraction is handled by schema
        });
    }
    catch (error)
    {
        handlePrismaError(error);
    }
    revalidateQuestionPaths(examSlug, paperId);
    return { success: true };
}