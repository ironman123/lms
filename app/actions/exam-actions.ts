"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { examSchema } from "@/types/exam";

export async function createExam(data: any) {
    const validated = examSchema.parse(data);

    await prisma.exam.create({
        data: {
            ...validated,
            // If tags is a string array in Prisma
            tags: validated.tags.filter(t => t !== ""),
            // If syllabus is a JSON column
            syllabus: validated.syllabus as any,
        }
    });

    revalidatePath("/library/exams");
}