import { z } from "zod";

export const paperSchema = z.object({
    title: z.string().min(1, "Title is required"),
    year: z.coerce.number()
        .int()
        .min(1990)
        .max(new Date().getFullYear())
        .optional(),
    examId: z.string().nullable().optional()
});

export type PaperFormValues = z.infer<typeof paperSchema>;