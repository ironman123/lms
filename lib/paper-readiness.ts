import type { ResultQuestion } from "@/lib/exam-results";
import { parseResultOptions } from "@/lib/exam-results";

export type PaperReadinessIssueCode =
    | "EMPTY_CONTENT"
    | "INVALID_MARKS"
    | "INVALID_NEGATIVE_MARKS"
    | "INVALID_OPTIONS"
    | "INVALID_ANSWER_KEY"
    | "NO_SCORABLE_QUESTIONS"
    | "SUBJECTIVE_REQUIRES_MANUAL_GRADING";

export type PaperReadinessIssue = {
    questionId: string;
    questionNumber: number;
    code: PaperReadinessIssueCode;
    message: string;
};

export type PaperReadiness = {
    ready: boolean;
    issues: PaperReadinessIssue[];
};

function issue(
    question: ResultQuestion,
    questionNumber: number,
    code: PaperReadinessIssueCode,
    message: string
): PaperReadinessIssue {
    return { questionId: question.id, questionNumber, code, message };
}

/**
 * Launch is intentionally stricter than the editor. A paper is safe for
 * automatic scoring only when every active question has an authoritative key.
 * Subjective questions stay editable, but cannot launch until manual grading
 * is implemented.
 */
export function getPaperReadiness(
    questions: ResultQuestion[]
): PaperReadiness {
    const issues = questions.flatMap((question, index) => {
        const questionNumber = index + 1;
        const result: PaperReadinessIssue[] = [];

        if (!question.content.trim()) {
            result.push(issue(
                question,
                questionNumber,
                "EMPTY_CONTENT",
                `Question ${questionNumber} has no content.`
            ));
        }
        if (question.isCancelled) {
            if (question.marks !== 0) {
                result.push(issue(
                    question,
                    questionNumber,
                    "INVALID_MARKS",
                    `Cancelled question ${questionNumber} must award 0 marks.`
                ));
            }
            if (question.negativeMarks !== 0) {
                result.push(issue(
                    question,
                    questionNumber,
                    "INVALID_NEGATIVE_MARKS",
                    `Cancelled question ${questionNumber} cannot have negative marks.`
                ));
            }
            return result;
        }
        if (!Number.isFinite(question.marks) || question.marks <= 0) {
            result.push(issue(
                question,
                questionNumber,
                "INVALID_MARKS",
                `Question ${questionNumber} must award more than 0 marks.`
            ));
        }
        if (
            !Number.isFinite(question.negativeMarks) ||
            question.negativeMarks < 0
        ) {
            result.push(issue(
                question,
                questionNumber,
                "INVALID_NEGATIVE_MARKS",
                `Question ${questionNumber} has invalid negative marks.`
            ));
        }

        if (question.type === "SUBJECTIVE") {
            result.push(issue(
                question,
                questionNumber,
                "SUBJECTIVE_REQUIRES_MANUAL_GRADING",
                `Question ${questionNumber} is subjective; manual grading is not enabled.`
            ));
            return result;
        }

        if (question.type === "MCQ" || question.type === "MSQ") {
            const options = parseResultOptions(question.options);
            const optionIndexes = new Set(options.map((option) => option.index));
            const uniqueCorrect = new Set(question.correctOptions);
            if (
                options.length < 2 ||
                optionIndexes.size !== options.length ||
                options.some((option) => !option.text.trim())
            ) {
                result.push(issue(
                    question,
                    questionNumber,
                    "INVALID_OPTIONS",
                    `Question ${questionNumber} must have at least two distinct, non-empty options.`
                ));
            }
            const expectedKeyCount = question.type === "MCQ" ? 1 : null;
            if (
                uniqueCorrect.size === 0 ||
                uniqueCorrect.size !== question.correctOptions.length ||
                (expectedKeyCount !== null &&
                    uniqueCorrect.size !== expectedKeyCount) ||
                [...uniqueCorrect].some((answer) => !optionIndexes.has(answer))
            ) {
                result.push(issue(
                    question,
                    questionNumber,
                    "INVALID_ANSWER_KEY",
                    `Question ${questionNumber} has no valid authoritative answer key.`
                ));
            }
        }

        if (question.type === "NUMERICAL") {
            const hasExact =
                question.exactAnswer !== null &&
                Number.isFinite(question.exactAnswer);
            const hasRange =
                question.answerMin !== null &&
                question.answerMax !== null &&
                Number.isFinite(question.answerMin) &&
                Number.isFinite(question.answerMax) &&
                question.answerMin <= question.answerMax;
            if (!hasExact && !hasRange) {
                result.push(issue(
                    question,
                    questionNumber,
                    "INVALID_ANSWER_KEY",
                    `Question ${questionNumber} has no valid numerical answer key.`
                ));
            }
        }

        return result;
    });

    if (
        questions.length > 0 &&
        questions.every((question) => question.isCancelled)
    ) {
        issues.push(issue(
            questions[0],
            1,
            "NO_SCORABLE_QUESTIONS",
            "The paper has no scorable questions."
        ));
    }

    return { ready: issues.length === 0, issues };
}

export function paperReadinessMessage(readiness: PaperReadiness) {
    if (readiness.ready) return null;
    const first = readiness.issues[0];
    const remaining = readiness.issues.length - 1;
    return remaining > 0
        ? `This paper is not ready for students: ${first.message} ${remaining} more issue${remaining === 1 ? "" : "s"} must be fixed.`
        : `This paper is not ready for students: ${first.message}`;
}
