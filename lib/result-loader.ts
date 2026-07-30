import "server-only";

import { SessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
    createQuestionSnapshot,
    evaluateAnswer,
    formatCorrectAnswer,
    formatResultAnswer,
    parseQuestionSetSnapshot,
    parseResultOptions,
    type QuestionSnapshot,
    type ResultGrade,
    type ResultQuestion,
} from "@/lib/exam-results";

export type ResultReviewItem = {
    id: string;
    position: number;
    grade: ResultGrade;
    question: QuestionSnapshot;
    selectedAnswer: string | null;
    selectedAnswerText: string;
    correctAnswerText: string;
    marksAwarded: number;
    penaltyApplied: number;
    isFlagged: boolean;
    wasHinted: boolean;
    confidenceLevel: number | null;
    dwellTimeSeconds: number;
    options: Array<{
        index: number;
        label: string;
        text: string;
        imageUrl?: string;
        isSelected: boolean;
        isCorrect: boolean;
    }>;
};

export type ResultView = {
    sessionId: string;
    paperId: string;
    paperTitle: string;
    exam: { name: string; slug: string } | null;
    mode: string;
    completedAt: string;
    summary: {
        scorePercent: number;
        earnedMarks: number;
        maximumMarks: number;
        penaltyMarks: number;
        totalQuestions: number;
        attemptedCount: number;
        correctCount: number;
        incorrectCount: number;
        skippedCount: number;
        pendingReviewCount: number;
        accuracy: number;
        timeTakenSecs: number | null;
    };
    review: ResultReviewItem[];
    reviewComplete: boolean;
    unavailableCount: number;
};

function isQuestionSnapshot(value: unknown): value is QuestionSnapshot {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const snapshot = value as Record<string, unknown>;
    return (
        snapshot.version === 1 &&
        typeof snapshot.content === "string" &&
        typeof snapshot.type === "string" &&
        typeof snapshot.marks === "number" &&
        Array.isArray(snapshot.correctOptions)
    );
}

function toQuestionInput(question: ResultQuestion): ResultQuestion {
    return {
        id: question.id,
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        explanation: question.explanation,
        topicPath: question.topicPath,
        options: question.options,
        correctOptions: question.correctOptions,
        exactAnswer: question.exactAnswer,
        answerMin: question.answerMin,
        answerMax: question.answerMax,
        modelAnswer: question.modelAnswer,
    };
}

export async function loadCompletedResult(
    sessionId: string
): Promise<ResultView | null> {
    const user = await requireAuth();
    const session = await prisma.testSession.findFirst({
        where: {
            id: sessionId,
            userId: user.id,
            status: SessionStatus.COMPLETED,
            completedAt: { not: null },
        },
        include: {
            paper: {
                include: {
                    questions: {
                        orderBy: { createdAt: "asc" },
                    },
                    examQuestionPaperLinks: {
                        select: {
                            exam: {
                                select: { name: true, slug: true },
                            },
                        },
                        take: 1,
                    },
                },
            },
            interactions: true,
        },
    });

    if (!session) return null;

    const interactionByQuestion = new Map(
        session.interactions.map((interaction) => [
            interaction.questionId,
            interaction,
        ])
    );
    const reviewQuestions =
        parseQuestionSetSnapshot(session.questionSetSnapshot) ??
        session.paper.questions.map(toQuestionInput);

    const review = reviewQuestions.map((question, position) => {
        const interaction = interactionByQuestion.get(question.id);
        const fallbackQuestion = question;
        const snapshot =
            interaction && isQuestionSnapshot(interaction.questionSnapshot)
                ? interaction.questionSnapshot
                : createQuestionSnapshot(fallbackQuestion);
        const selectedAnswer = interaction?.selectedAnswer?.trim() || null;
        const legacyEvaluation = interaction
            ? evaluateAnswer(fallbackQuestion, selectedAnswer)
            : null;
        const hasFinalSnapshot = Boolean(
            interaction && isQuestionSnapshot(interaction.questionSnapshot)
        );
        const grade: ResultGrade = !interaction
            ? "UNAVAILABLE"
            : hasFinalSnapshot
                ? interaction.grade
                : legacyEvaluation?.grade ?? "UNAVAILABLE";
        const options = parseResultOptions(snapshot.options);
        const selectedIndices = new Set(
            selectedAnswer
                ?.split(",")
                .map((value) => Number(value.trim()))
                .filter(Number.isInteger) ?? []
        );

        return {
            id: interaction?.id ?? `unavailable-${question.id}`,
            position:
                interaction?.questionPosition !== null &&
                interaction?.questionPosition !== undefined
                    ? interaction.questionPosition
                    : position,
            grade,
            question: snapshot,
            selectedAnswer,
            selectedAnswerText: formatResultAnswer(snapshot, selectedAnswer),
            correctAnswerText: formatCorrectAnswer(snapshot),
            marksAwarded: hasFinalSnapshot
                ? interaction?.marksAwarded ?? 0
                : legacyEvaluation?.marksAwarded ?? 0,
            penaltyApplied: hasFinalSnapshot
                ? interaction?.penaltyApplied ?? 0
                : legacyEvaluation?.penaltyApplied ?? 0,
            isFlagged: interaction?.isFlagged ?? false,
            wasHinted: interaction?.wasHinted ?? false,
            confidenceLevel: interaction?.confidenceLevel ?? null,
            dwellTimeSeconds: interaction?.totalDwellTime ?? 0,
            options: options.map((option) => ({
                ...option,
                label:
                    option.label ??
                    String.fromCharCode(65 + Math.max(0, option.index)),
                isSelected: selectedIndices.has(option.index),
                isCorrect: snapshot.correctOptions.includes(option.index),
            })),
        } satisfies ResultReviewItem;
    }).sort((left, right) => left.position - right.position);

    const maximumMarks =
        session.maximumMarks ??
        reviewQuestions.reduce(
            (sum, question) => sum + question.marks,
            0
        );
    const earnedMarks =
        session.earnedMarks ??
        maximumMarks * ((session.totalScore ?? 0) / 100);
    const pendingReviewCount = session.pendingReviewCount;
    const incorrectCount = Math.max(
        0,
        session.attemptedCount -
            session.correctCount -
            pendingReviewCount
    );
    const totalQuestions =
        session.totalQuestions || reviewQuestions.length;
    const skippedCount = Math.max(
        0,
        totalQuestions - session.attemptedCount
    );
    const unavailableCount = review.filter(
        (item) => item.grade === "UNAVAILABLE"
    ).length;
    const exam = session.paper.examQuestionPaperLinks[0]?.exam ?? null;

    return {
        sessionId: session.id,
        paperId: session.paperId,
        paperTitle: session.paper.title,
        exam,
        mode: session.mode,
        completedAt: (
            session.completedAt ??
            session.endTime ??
            session.startTime
        ).toISOString(),
        summary: {
            scorePercent: session.totalScore ?? 0,
            earnedMarks,
            maximumMarks,
            penaltyMarks: session.penaltyMarks,
            totalQuestions,
            attemptedCount: session.attemptedCount,
            correctCount: session.correctCount,
            incorrectCount,
            skippedCount,
            pendingReviewCount,
            accuracy: session.accuracy ?? 0,
            timeTakenSecs: session.timeTakenSecs,
        },
        review,
        reviewComplete: unavailableCount === 0,
        unavailableCount,
    };
}
