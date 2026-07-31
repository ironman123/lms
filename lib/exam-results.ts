export type ResultGrade =
    | "CORRECT"
    | "INCORRECT"
    | "SKIPPED"
    | "PENDING"
    | "UNAVAILABLE";

export type ResultQuestionType = "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE";

export type ResultOption = {
    index: number;
    label?: string;
    text: string;
    imageUrl?: string;
};

export type ResultQuestion = {
    id: string;
    contentRevision?: number;
    content: string;
    type: ResultQuestionType;
    difficulty: string;
    marks: number;
    negativeMarks: number;
    explanation: string | null;
    topicPath: string | null;
    isCancelled?: boolean;
    options: unknown;
    correctOptions: number[];
    exactAnswer: number | null;
    answerMin: number | null;
    answerMax: number | null;
    modelAnswer: string | null;
};

export type SubmittedResultMetric = {
    questionId: string;
    selectedAnswer: string | null;
    visitCount: number;
    dwellTimeSeconds: number;
    hesitationCount: number;
    isFlagged: boolean;
    wasHinted: boolean;
    confidenceLevel: number | null;
};

export type QuestionSnapshot = Omit<ResultQuestion, "id"> & {
    version: 1;
    contentRevision: number;
};

export type SessionQuestionSnapshot = ResultQuestion & {
    version: 1;
    contentRevision?: number;
};

export type EvaluatedMetric = SubmittedResultMetric & {
    isCorrect: boolean;
    grade: ResultGrade;
    questionPosition: number;
    marksAwarded: number;
    penaltyApplied: number;
    questionSnapshot: QuestionSnapshot;
};

export type SessionResult = {
    metrics: EvaluatedMetric[];
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    pendingReviewCount: number;
    unavailableCount: number;
    maximumMarks: number;
    earnedMarks: number;
    penaltyMarks: number;
    totalScore: number;
    accuracy: number;
};

export function summarizeResultGrades(grades: ResultGrade[]) {
    const correctCount = grades.filter((grade) => grade === "CORRECT").length;
    const incorrectCount = grades.filter(
        (grade) => grade === "INCORRECT"
    ).length;
    const skippedCount = grades.filter((grade) => grade === "SKIPPED").length;
    const pendingReviewCount = grades.filter(
        (grade) => grade === "PENDING"
    ).length;
    const unavailableCount = grades.filter(
        (grade) => grade === "UNAVAILABLE"
    ).length;
    const attemptedCount =
        correctCount + incorrectCount + pendingReviewCount;
    const objectivelyGraded = correctCount + incorrectCount;

    return {
        correctCount,
        incorrectCount,
        skippedCount,
        pendingReviewCount,
        unavailableCount,
        attemptedCount,
        accuracy:
            objectivelyGraded > 0
                ? round((correctCount / objectivelyGraded) * 100)
                : 0,
    };
}

function round(value: number, places = 2) {
    const multiplier = 10 ** places;
    return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function normalizeSelectedAnswer(answer: string | null | undefined) {
    const normalized = answer?.trim();
    return normalized ? normalized : null;
}

export function hasMeaningfulAnswer(
    answer: string | string[] | null | undefined
) {
    if (Array.isArray(answer)) return answer.length > 0;
    return Boolean(answer?.trim());
}

export function parseResultOptions(value: unknown): ResultOption[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((option, position) => {
        if (!option || typeof option !== "object") return [];
        const candidate = option as Record<string, unknown>;
        if (typeof candidate.text !== "string") return [];

        return [{
            index:
                typeof candidate.index === "number" &&
                Number.isInteger(candidate.index)
                    ? candidate.index
                    : position,
            label:
                typeof candidate.label === "string"
                    ? candidate.label
                    : undefined,
            text: candidate.text,
            imageUrl:
                typeof candidate.imageUrl === "string"
                    ? candidate.imageUrl
                    : undefined,
        }];
    });
}

function parseIndexList(answer: string) {
    const values = answer
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));
    return [...new Set(values)].sort((left, right) => left - right);
}

export function isQuestionGradable(question: ResultQuestion) {
    if (question.isCancelled) return false;
    if (question.type === "MCQ") {
        return question.correctOptions.length === 1;
    }
    if (question.type === "MSQ") {
        return question.correctOptions.length > 0;
    }
    if (question.type === "NUMERICAL") {
        return question.exactAnswer !== null ||
            (question.answerMin !== null && question.answerMax !== null);
    }
    return true;
}

export function evaluateAnswer(
    question: ResultQuestion,
    selectedAnswer: string | null | undefined
) {
    const answer = normalizeSelectedAnswer(selectedAnswer);

    if (!isQuestionGradable(question)) {
        return {
            selectedAnswer: answer,
            grade: "UNAVAILABLE" as const,
            isCorrect: false,
            marksAwarded: 0,
            penaltyApplied: 0,
        };
    }

    if (!answer) {
        return {
            selectedAnswer: null,
            grade: "SKIPPED" as const,
            isCorrect: false,
            marksAwarded: 0,
            penaltyApplied: 0,
        };
    }

    if (question.type === "SUBJECTIVE") {
        return {
            selectedAnswer: answer,
            grade: "PENDING" as const,
            isCorrect: false,
            marksAwarded: 0,
            penaltyApplied: 0,
        };
    }

    let isCorrect = false;
    if (question.type === "MCQ") {
        const submitted = Number(answer);
        isCorrect =
            Number.isInteger(submitted) &&
            question.correctOptions.length === 1 &&
            question.correctOptions[0] === submitted;
    } else if (question.type === "MSQ") {
        const submitted = parseIndexList(answer);
        const expected = [...new Set(question.correctOptions)].sort(
            (left, right) => left - right
        );
        isCorrect =
            submitted.length === expected.length &&
            submitted.every((value, index) => value === expected[index]);
    } else if (question.type === "NUMERICAL") {
        const submitted = Number(answer);
        if (Number.isFinite(submitted)) {
            if (question.exactAnswer !== null) {
                isCorrect = submitted === question.exactAnswer;
            } else if (
                question.answerMin !== null &&
                question.answerMax !== null
            ) {
                isCorrect =
                    submitted >= question.answerMin &&
                    submitted <= question.answerMax;
            }
        }
    }

    const penaltyApplied = isCorrect
        ? 0
        : Math.max(0, question.negativeMarks);

    return {
        selectedAnswer: answer,
        grade: isCorrect ? ("CORRECT" as const) : ("INCORRECT" as const),
        isCorrect,
        marksAwarded: isCorrect ? question.marks : -penaltyApplied,
        penaltyApplied,
    };
}

export function createQuestionSnapshot(
    question: ResultQuestion
): QuestionSnapshot {
    return {
        version: 1,
        contentRevision: question.contentRevision ?? 1,
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        explanation: question.explanation,
        topicPath: question.topicPath,
        isCancelled: Boolean(question.isCancelled),
        options: parseResultOptions(question.options),
        correctOptions: [...question.correctOptions],
        exactAnswer: question.exactAnswer,
        answerMin: question.answerMin,
        answerMax: question.answerMax,
        modelAnswer: question.modelAnswer,
    };
}

export function createQuestionSetSnapshot(
    questions: ResultQuestion[]
): SessionQuestionSnapshot[] {
    return questions.map((question) => ({
        id: question.id,
        ...createQuestionSnapshot(question),
    }));
}

function isSessionQuestionSnapshot(
    value: unknown
): value is SessionQuestionSnapshot {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const question = value as Record<string, unknown>;
    return (
        question.version === 1 &&
        typeof question.id === "string" &&
        (question.contentRevision === undefined ||
            (typeof question.contentRevision === "number" &&
                Number.isInteger(question.contentRevision) &&
                question.contentRevision > 0)) &&
        typeof question.content === "string" &&
        ["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"].includes(
            String(question.type)
        ) &&
        typeof question.difficulty === "string" &&
        typeof question.marks === "number" &&
        typeof question.negativeMarks === "number" &&
        (question.isCancelled === undefined ||
            typeof question.isCancelled === "boolean") &&
        Array.isArray(question.correctOptions)
    );
}

export function parseQuestionSetSnapshot(
    value: unknown
): SessionQuestionSnapshot[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.every(isSessionQuestionSnapshot) ? value : null;
}

export function calculateSessionResult(
    questions: ResultQuestion[],
    submittedMetrics: SubmittedResultMetric[]
): SessionResult {
    const submittedByQuestion = new Map(
        submittedMetrics.map((metric) => [metric.questionId, metric])
    );

    const metrics = questions.map((question, questionPosition) => {
        const submitted = submittedByQuestion.get(question.id) ?? {
            questionId: question.id,
            selectedAnswer: null,
            visitCount: 0,
            dwellTimeSeconds: 0,
            hesitationCount: 0,
            isFlagged: false,
            wasHinted: false,
            confidenceLevel: null,
        };
        const evaluation = evaluateAnswer(question, submitted.selectedAnswer);

        return {
            ...submitted,
            selectedAnswer: evaluation.selectedAnswer,
            isCorrect: evaluation.isCorrect,
            grade: evaluation.grade,
            questionPosition,
            marksAwarded: evaluation.marksAwarded,
            penaltyApplied: evaluation.penaltyApplied,
            questionSnapshot: createQuestionSnapshot(question),
        };
    });

    const {
        correctCount,
        incorrectCount,
        skippedCount,
        pendingReviewCount,
        unavailableCount,
        attemptedCount,
        accuracy,
    } = summarizeResultGrades(metrics.map((metric) => metric.grade));
    const maximumMarks = round(metrics.reduce(
        (sum, metric) =>
            metric.grade === "UNAVAILABLE"
                ? sum
                : sum + metric.questionSnapshot.marks,
        0
    ));
    const earnedMarks = round(
        metrics.reduce((sum, metric) => sum + metric.marksAwarded, 0)
    );
    const penaltyMarks = round(
        metrics.reduce((sum, metric) => sum + metric.penaltyApplied, 0)
    );
    const totalScore =
        maximumMarks > 0 ? round((earnedMarks / maximumMarks) * 100) : 0;
    return {
        metrics,
        totalQuestions: questions.length,
        attemptedCount,
        correctCount,
        incorrectCount,
        skippedCount,
        pendingReviewCount,
        unavailableCount,
        maximumMarks,
        earnedMarks,
        penaltyMarks,
        totalScore,
        accuracy,
    };
}

export function formatResultAnswer(
    question: QuestionSnapshot,
    selectedAnswer: string | null
) {
    const answer = normalizeSelectedAnswer(selectedAnswer);
    if (!answer) return "Not answered";

    if (question.type === "MCQ" || question.type === "MSQ") {
        const options = parseResultOptions(question.options);
        const selected = parseIndexList(answer);
        return selected
            .map((index) => {
                const option = options.find((candidate) => candidate.index === index);
                return option
                    ? `${option.label ?? String.fromCharCode(65 + index)}. ${option.text}`
                    : `Option ${index + 1}`;
            })
            .join(", ");
    }

    return answer;
}

export function formatCorrectAnswer(question: QuestionSnapshot) {
    if (question.isCancelled) return "Cancelled in the official answer key";
    if (question.type === "MCQ" || question.type === "MSQ") {
        const options = parseResultOptions(question.options);
        return question.correctOptions
            .map((index) => {
                const option = options.find((candidate) => candidate.index === index);
                return option
                    ? `${option.label ?? String.fromCharCode(65 + index)}. ${option.text}`
                    : `Option ${index + 1}`;
            })
            .join(", ");
    }
    if (question.type === "NUMERICAL") {
        if (question.exactAnswer !== null) return String(question.exactAnswer);
        if (question.answerMin !== null && question.answerMax !== null) {
            return `${question.answerMin} – ${question.answerMax}`;
        }
    }
    if (question.type === "SUBJECTIVE") {
        return question.modelAnswer ?? "Awaiting manual review";
    }
    return "Not available";
}

export function formatResultDuration(totalSeconds: number | null) {
    if (!totalSeconds || totalSeconds <= 0) return "Under 1 min";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}
