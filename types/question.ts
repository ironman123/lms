// types/question.ts
import { z } from "zod";

// ── Option ──────────────────────────────────────────────────────────────────
// Matches the JSONB shape stored in Question.options
export const optionSchema = z.object({
    index: z.number().int().min(0),
    text: z.string().min(1, "Option text cannot be empty"),
    imageUrl: z.string().url("Invalid image URL").optional(),
});

// ── Question ─────────────────────────────────────────────────────────────────
export const questionSchema = z
    .object({
        content: z.string().min(1, "Question content cannot be empty"),
        type: z.enum(["MCQ", "MSQ", "NUMERICAL", "SUBJECTIVE"]),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
        marks: z.coerce.number().min(0, "Marks must be 0 or greater"),
        negativeMarks: z.coerce
            .number()
            .min(0, "Enter as positive number e.g. 0.25")
            .default(0),
        explanation: z.string().optional().nullable(),
        topicPath: z.string().optional().nullable(),
        topicId: z.string().optional().nullable(),

        // MCQ / MSQ
        options: z.array(optionSchema).default([]),
        correctOptions: z.array(z.number().int().min(0)).default([]),

        // NUMERICAL
        exactAnswer: z.coerce.number().optional().nullable(),
        answerMin: z.coerce.number().optional().nullable(),
        answerMax: z.coerce.number().optional().nullable(),

        // SUBJECTIVE
        modelAnswer: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "MCQ" || data.type === "MSQ")
        {
            const validOptions = data.options.filter((o) => o.text.trim() !== "");

            if (validOptions.length < 2)
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "MCQ/MSQ must have at least 2 options.",
                    path: ["options"],
                });
            }

            if (data.correctOptions.length === 0)
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "You must mark at least one correct option.",
                    path: ["correctOptions"],
                });
            }

            if (data.type === "MCQ" && data.correctOptions.length > 1)
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "MCQ can only have ONE correct option. Use MSQ for multiple.",
                    path: ["correctOptions"],
                });
            }

            // Validate correctOptions indices actually exist in options
            const maxIndex = data.options.length - 1;
            for (const idx of data.correctOptions)
            {
                if (idx > maxIndex)
                {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Correct option index ${idx} does not exist.`,
                        path: ["correctOptions"],
                    });
                }
            }
        }

        if (data.type === "NUMERICAL")
        {
            const hasExact = data.exactAnswer != null;
            const hasRange = data.answerMin != null && data.answerMax != null;

            if (!hasExact && !hasRange)
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Provide either an exact answer or a min/max range.",
                    path: ["exactAnswer"],
                });
            }

            if (
                data.answerMin != null &&
                data.answerMax != null &&
                data.answerMin > data.answerMax
            )
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "answerMin cannot be greater than answerMax.",
                    path: ["answerMin"],
                });
            }
        }

        if (data.type === "SUBJECTIVE")
        {
            if (!data.modelAnswer?.trim())
            {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Model answer is required for subjective questions.",
                    path: ["modelAnswer"],
                });
            }
        }
    });

// ── Inferred Types ───────────────────────────────────────────────────────────
export type OptionJSON = z.infer<typeof optionSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type QuestionFormInput = z.input<typeof questionSchema>;