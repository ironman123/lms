"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
// Assuming examSchema is updated. It should look something like:
// syllabus: z.array(z.object({ category: z.string(), topics: z.array(z.string()) }))
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
            // 1. Create the base Exam (No changes needed here)
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

            // 2. Handle Tags (Many-to-Many) - Keeping your existing logic
            if (validated.tags && validated.tags.length > 0)
            {
                for (const tagName of validated.tags)
                {
                    const tag = await tx.tag.upsert({
                        where: { name: tagName },
                        update: {},
                        create: { name: tagName },
                    });

                    await tx.examsTagsLink.create({
                        data: {
                            examId: exam.id,
                            tagId: tag.id,
                        },
                    });
                }
            }

            // 3. Handle Syllabus (Categories and Topics mapped via ExamTopic bridge)
            if (validated.syllabus && validated.syllabus.length > 0)
            {
                for (const item of validated.syllabus)
                {

                    // A. Check if the GLOBAL Category (Subject) already exists
                    let category = await tx.category.findFirst({
                        where: { name: item.category },
                    });

                    // B. If it doesn't exist, create it
                    if (!category)
                    {
                        category = await tx.category.create({
                            data: { name: item.category },
                        });
                    }

                    // C. Handle Topics under this Category
                    if (item.topics && item.topics.length > 0)
                    {
                        for (const topicName of item.topics)
                        {

                            // Check if this GLOBAL Topic already exists under this Category
                            let topic = await tx.topic.findFirst({
                                where: {
                                    name: topicName,
                                    categoryId: category.id
                                },
                            });

                            // If it doesn't exist, create it so future exams can use it
                            if (!topic)
                            {
                                topic = await tx.topic.create({
                                    data: {
                                        name: topicName,
                                        categoryId: category.id,
                                    },
                                });
                            }

                            // D. Create the Bridge Record (ExamTopic)
                            // This specifically maps the global Topic to this specific Exam
                            await tx.examTopic.create({
                                data: {
                                    examId: exam.id,
                                    topicId: topic.id,
                                    // weightage: ... // You can add weightage here later if passed from the frontend
                                },
                            });
                        }
                    }
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