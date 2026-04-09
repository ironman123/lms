import { z } from "zod";

// ── Option Schema ───────────────────────────────────────────────────────────
export const optionSchema = z.object({
    text: z.string().default(""),
    isCorrect: z.boolean(),
});

// ── Main Question Schema ────────────────────────────────────────────────────
export const questionSchema = z.object({
    content: z.string().min(1, "Question content cannot be empty"),
    type: z.enum(["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"]),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    marks: z.coerce.number().min(0, "Marks must be 0 or greater"),
    negativeMarks: z.coerce.number().min(0, "Enter as a positive number (e.g. 0.25, not -0.25)"),
    explanation: z.string().optional().nullable().default(""),
    correctAnswer: z.string().optional().nullable().default(""),
    topicPath: z.string().optional().nullable().default(""),  // ← add
    topicId: z.string().optional().default(""),  // ← add
    options: z.array(optionSchema).optional().default([]),
}).superRefine((data, ctx) => {
    // Custom validation logic for specific question types

    if (data.type === "MCQ" || data.type === "MSQ")
    {
        // 1. Must have at least 2 options with actual text
        const validOptions = data.options?.filter(opt => opt.text.trim() !== "") || [];
        if (validOptions.length < 2)
        {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "MCQ/MSQ must have at least 2 valid options.",
                path: ["options"],
            });
        }

        // 2. Must have at least 1 correct option selected
        const correctCount = validOptions.filter(opt => opt.isCorrect).length;
        if (correctCount === 0)
        {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "You must select at least one correct option.",
                path: ["options"],
            });
        }

        // 3. If MCQ, cannot have MORE than 1 correct option
        if (data.type === "MCQ" && correctCount > 1)
        {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "MCQ can only have ONE correct option. Use MSQ for multiple.",
                path: ["options"],
            });
        }
    }

    if (data.type === "NUMERICAL" || data.type === "SUBJECTIVE")
    {
        // Must provide a correct answer string
        if (!data.correctAnswer || data.correctAnswer.trim() === "")
        {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Correct answer is required for this question type.",
                path: ["correctAnswer"],
            });
        }
    }
});

// ── Inferred Types for TypeScript ───────────────────────────────────────────
// z.infer automatically generates the TypeScript interfaces based on your schemas above!
export type OptionFormValues = z.infer<typeof optionSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type QuestionFormInput = z.input<typeof questionSchema>;