import { z } from "zod";

const optionImportSchema = z
    .object({
        label: z
            .string()
            .trim()
            .regex(
                /^[A-Za-z]$/,
                "Option label must be one letter, such as A or B"
            )
            .transform((label) => label.toUpperCase()),
        text: z.string().trim().min(1, "Option text is required"),
        imageUrl: z.string().url("Option imageUrl must be a valid URL").optional(),
    })
    .strict();

const answerLabelSchema = z
    .string()
    .trim()
    .regex(/^[A-Za-z]$/, "Correct answers must use option labels such as A or B")
    .transform((label) => label.toUpperCase());

const questionImportSchema = z
    .object({
        number: z.number().int().positive(),
        content: z.string().trim().min(1, "Question content is required"),
        type: z.enum(["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"]),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
        marks: z.number().nonnegative().default(1),
        negativeMarks: z.number().nonnegative().default(0),
        topicPath: z.string().trim().default(""),
        explanation: z.string().trim().nullable().optional().default(null),
        options: z
            .array(optionImportSchema)
            .max(6, "The paper builder supports up to six options")
            .default([]),
        correctAnswers: z
            .array(answerLabelSchema)
            .max(6, "Too many correct answers")
            .default([]),
        exactAnswer: z.number().nullable().optional().default(null),
        answerMin: z.number().nullable().optional().default(null),
        answerMax: z.number().nullable().optional().default(null),
        modelAnswer: z.string().trim().nullable().optional().default(null),
    })
    .strict()
    .superRefine((question, context) => {
        if (question.type === "MCQ" || question.type === "MSQ") {
            if (question.options.length < 2) {
                context.addIssue({
                    code: "custom",
                    path: ["options"],
                    message: "MCQ and MSQ questions need at least two options",
                });
            }

            const optionLabels = question.options.map((option) => option.label);
            if (new Set(optionLabels).size !== optionLabels.length) {
                context.addIssue({
                    code: "custom",
                    path: ["options"],
                    message: "Option labels must be unique",
                });
            }
            if (
                new Set(question.correctAnswers).size !==
                question.correctAnswers.length
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["correctAnswers"],
                    message: "Correct answer labels must be unique",
                });
            }
            optionLabels.forEach((label, index) => {
                const expectedLabel = String.fromCharCode(65 + index);
                if (label !== expectedLabel) {
                    context.addIssue({
                        code: "custom",
                        path: ["options", index, "label"],
                        message: `Expected option label ${expectedLabel} at this position`,
                    });
                }
            });

            if (question.correctAnswers.length < 1) {
                context.addIssue({
                    code: "custom",
                    path: ["correctAnswers"],
                    message: "At least one correct answer is required",
                });
            }
            if (
                question.type === "MCQ" &&
                question.correctAnswers.length !== 1
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["correctAnswers"],
                    message: "MCQ questions must have exactly one correct answer",
                });
            }

            for (const answer of question.correctAnswers) {
                if (!optionLabels.includes(answer)) {
                    context.addIssue({
                        code: "custom",
                        path: ["correctAnswers"],
                        message: `Correct answer ${answer} does not match an option label`,
                    });
                }
            }
        }

        if (question.type === "NUMERICAL") {
            const hasExactAnswer = question.exactAnswer !== null;
            const hasRange =
                question.answerMin !== null && question.answerMax !== null;
            if (!hasExactAnswer && !hasRange) {
                context.addIssue({
                    code: "custom",
                    path: ["exactAnswer"],
                    message:
                        "Numerical questions need exactAnswer or both answerMin and answerMax",
                });
            }
            if (
                hasRange &&
                question.answerMin! > question.answerMax!
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["answerMin"],
                    message: "answerMin cannot be greater than answerMax",
                });
            }
        }

        if (
            question.type === "SUBJECTIVE" &&
            !question.modelAnswer?.trim()
        ) {
            context.addIssue({
                code: "custom",
                path: ["modelAnswer"],
                message: "Subjective questions need a modelAnswer",
            });
        }
    });

export const paperJsonImportSchema = z
    .object({
        version: z.literal(1).default(1),
        title: z.string().trim().min(1, "Paper title is required"),
        year: z
            .number()
            .int()
            .min(1900)
            .max(new Date().getFullYear())
            .nullable()
            .default(null),
        type: z.enum(["PYQ", "MOCK"]).default("MOCK"),
        questions: z
            .array(questionImportSchema)
            .min(1, "At least one question is required")
            .max(500, "A single JSON import supports up to 500 questions"),
    })
    .strict()
    .superRefine((paper, context) => {
        const numbers = paper.questions.map((question) => question.number);
        if (new Set(numbers).size !== numbers.length) {
            context.addIssue({
                code: "custom",
                path: ["questions"],
                message: "Question numbers must be unique",
            });
        }
    });

export type PaperJsonImport = z.infer<typeof paperJsonImportSchema>;
export type PaperJsonQuestion = PaperJsonImport["questions"][number];

export function normalizePaperJsonQuestion(question: PaperJsonQuestion) {
    const optionIndexByLabel = new Map(
        question.options.map((option, index) => [option.label, index])
    );

    return {
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        explanation: question.explanation,
        topicPath: question.topicPath,
        options: question.options.map((option, index) => ({
            index,
            label: String.fromCharCode(65 + index),
            text: option.text,
            imageUrl: option.imageUrl,
        })),
        correctOptions: question.correctAnswers.map(
            (label) => optionIndexByLabel.get(label)!
        ),
        exactAnswer: question.exactAnswer,
        answerMin: question.answerMin,
        answerMax: question.answerMax,
        modelAnswer: question.modelAnswer,
    };
}

export function parsePaperJsonImport(source: string):
    | { success: true; data: PaperJsonImport }
    | { success: false; error: string } {
    let json: unknown;
    try {
        json = JSON.parse(source);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? `Invalid JSON syntax: ${error.message}`
                    : "Invalid JSON syntax",
        };
    }

    const parsed = paperJsonImportSchema.safeParse(json);
    if (parsed.success) return { success: true, data: parsed.data };

    const details = parsed.error.issues.slice(0, 5).map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "file";
        return `${path}: ${issue.message}`;
    });
    const remaining = parsed.error.issues.length - details.length;
    return {
        success: false,
        error: `${details.join("; ")}${
            remaining > 0 ? `; plus ${remaining} more issue(s)` : ""
        }`,
    };
}

export const PAPER_JSON_TEMPLATE: PaperJsonImport = {
    version: 1,
    title: "Example Kerala PSC Paper",
    year: 2026,
    type: "PYQ",
    questions: [
        {
            number: 1,
            content: "Which city is the capital of Kerala?",
            type: "MCQ",
            difficulty: "EASY",
            marks: 1,
            negativeMarks: 0.33,
            topicPath: "General Knowledge > Kerala",
            explanation: "Thiruvananthapuram is the capital of Kerala.",
            options: [
                { label: "A", text: "Kochi" },
                { label: "B", text: "Thiruvananthapuram" },
                { label: "C", text: "Kozhikode" },
                { label: "D", text: "Thrissur" },
            ],
            correctAnswers: ["B"],
            exactAnswer: null,
            answerMin: null,
            answerMax: null,
            modelAnswer: null,
        },
        {
            number: 2,
            content: "Select the prime numbers.",
            type: "MSQ",
            difficulty: "MEDIUM",
            marks: 2,
            negativeMarks: 0,
            topicPath: "Mathematics > Number System",
            explanation: null,
            options: [
                { label: "A", text: "2" },
                { label: "B", text: "4" },
                { label: "C", text: "5" },
                { label: "D", text: "9" },
            ],
            correctAnswers: ["A", "C"],
            exactAnswer: null,
            answerMin: null,
            answerMax: null,
            modelAnswer: null,
        },
        {
            number: 3,
            content: "What is 12 multiplied by 8?",
            type: "NUMERICAL",
            difficulty: "EASY",
            marks: 1,
            negativeMarks: 0,
            topicPath: "Mathematics > Arithmetic",
            explanation: "12 × 8 equals 96.",
            options: [],
            correctAnswers: [],
            exactAnswer: 96,
            answerMin: null,
            answerMax: null,
            modelAnswer: null,
        },
        {
            number: 4,
            content: "Briefly explain the importance of the Indian Constitution.",
            type: "SUBJECTIVE",
            difficulty: "MEDIUM",
            marks: 5,
            negativeMarks: 0,
            topicPath: "Civics > Constitution",
            explanation: null,
            options: [],
            correctAnswers: [],
            exactAnswer: null,
            answerMin: null,
            answerMax: null,
            modelAnswer:
                "The Constitution defines the structure of government, protects fundamental rights, and establishes the rule of law.",
        },
    ],
};
