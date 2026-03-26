"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { examSchema } from "@/types/exam";

export async function createExam(data: any) {
    const validated = examSchema.parse(data);
    const slug = data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');

    try
    {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the base Exam
            const exam = await tx.exam.create({
                data: {
                    name: validated.name,
                    slug: slug,
                    description: validated.description,
                    duration: validated.duration,
                    totalMarks: validated.totalMarks,
                    examCategoryId: validated.examCategoryId,
                },
            });

            // 2. Handle Tags (Many-to-Many)
            if (validated.tags && validated.tags.length > 0)
            {
                for (const tagName of validated.tags)
                {
                    // Create tag if it doesn't exist, or just get it
                    const tag = await tx.tag.upsert({
                        where: { name: tagName },
                        update: {},
                        create: { name: tagName },
                    });

                    // Link tag to exam
                    await tx.examsTagsLink.create({
                        data: {
                            examId: exam.id,
                            tagId: tag.id,
                        },
                    });
                }
            }

            // 3. Handle Syllabus (Categories and Topics)
            for (const item of validated.syllabus)
            {
                const category = await tx.category.create({
                    data: {
                        name: item.category,
                        examId: exam.id,
                    },
                });

                // Create topics under this category
                if (item.topics && item.topics.length > 0)
                {
                    await tx.topic.createMany({
                        data: item.topics.map((topicName) => ({
                            name: topicName,
                            categoryId: category.id,
                        })),
                    });
                }
            }

            return exam;
        });

        revalidatePath("/library/exams");
        return { success: true, id: result.id };
    } catch (error)
    {
        console.error("PRISMA_ERROR:", error);
        throw new Error("Failed to create exam record.");
    }
}