import { z } from "zod";

export const syllabusItemSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    topics: z.array(z.string().min(1, 'Topic is required')).min(1, 'At least one topic is required'),
});

const coerceNumber = (min: number, message: string) =>
    z.union([z.string(), z.number()])
        .transform(val => Number(val))
        .pipe(z.number().min(min, { message }));

export const examSchema = z.object({
    name: z.string().min(2, { message: 'Exam name is required' }),
    examCategoryId: z.string().min(1, 'Please select a parent category'),
    description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
    categoryNumber: z.string().optional().nullable(),
    tags: z.array(z.string().min(1, 'Tag cannot be empty')).min(1, { message: 'At least one tag is required' }),
    duration: coerceNumber(1, 'Duration must be a positive number'),
    totalMarks: coerceNumber(1, 'Total marks must be a positive number'),
    syllabus: z.array(syllabusItemSchema).min(1, { message: 'At least one syllabus item is required' }),
});

export type ExamFormValues = z.infer<typeof examSchema>;
export type ExamFormInput = z.input<typeof examSchema>;