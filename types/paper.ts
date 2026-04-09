import { z } from "zod";

export const paperSchema = z.object({
    title: z.string().min(1, "Title is required"),
    year: z.coerce
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear())
        .optional()
        .or(z.literal(""))
        .transform(val => val === "" ? undefined : Number(val)),
    examIds: z.array(z.string()).optional().default([]),
});

export type PaperFormValues = z.infer<typeof paperSchema>;
export type PaperFormInput = z.input<typeof paperSchema>;