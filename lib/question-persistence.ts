import { Prisma } from "@prisma/client";
import { questionSchema } from "@/types/question";

export type ValidatedQuestion = ReturnType<typeof questionSchema.parse>;

export type ResolvedQuestionTopic = {
    topicId: string | null;
    topicPath: string | null;
    syllabusEntryId: string | null;
};

export function buildQuestionData(
    validated: ValidatedQuestion,
    resolvedTopic?: ResolvedQuestionTopic
) {
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
        topicPath:
            resolvedTopic?.topicPath ?? validated.topicPath?.trim() ?? null,
        topicId: resolvedTopic?.topicId ?? validated.topicId ?? null,
        syllabusEntryId:
            resolvedTopic?.syllabusEntryId ?? validated.syllabusEntryId ?? null,
        isCancelled,
        options: isOptionsType
            ? (validated.options as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctOptions: isCancelled
            ? []
            : isOptionsType
              ? validated.correctOptions
              : [],
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
