//types/paper.ts
import { z } from "zod";
import { QuestionPaperType } from "@prisma/client";


export const paperSchema = z.object({
    title: z.string().min(1, "Title is required"),
    year: z.coerce
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear())
        .optional()
        .nullable()
        .or(z.literal(""))
        .transform(val => val === "" ? undefined : Number(val)),
    type: z.nativeEnum(QuestionPaperType).default(QuestionPaperType.PYQ),
    examIds: z.array(z.string()).optional().default([]),
});

export type PaperFormValues = z.infer<typeof paperSchema>;
export type PaperFormInput = z.input<typeof paperSchema>;