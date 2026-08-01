// app/(main)/actions/exam-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { examSchema, ExamFormInput } from "@/types/exam";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateTag } from "@/lib/cache";
import { actionErrorMessage } from "@/lib/action-errors";

function makeSlug(name: string) {
    return name
        .toLowerCase()
        .replace(/[;,|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "")
        .trim();
}

export async function createExam(data: ExamFormInput) {
    await requireAdmin();
    try {
        const validated = examSchema.parse(data);
        const slug = makeSlug(validated.name);
        if (!slug) {
            return { success: false as const, error: "Exam name must contain letters or numbers." };
        }
        const categoryNumber = validated.categoryNumber?.trim() || null;
        const normalizedTags = [
            ...new Set(validated.tags.map((tag) => tag.trim()).filter(Boolean)),
        ];

        const result = await prisma.$transaction(async (tx) => {
            const categoryNames = [
                ...new Set(validated.syllabus.map((item) => item.category.trim())),
            ];
            const categoryMap = new Map<string, string>();
            for (const name of categoryNames) {
                const category = await tx.category.upsert({
                    where: { name },
                    update: {},
                    create: { name },
                    select: { id: true, name: true },
                });
                categoryMap.set(category.name, category.id);
            }

            const leafLookups = validated.syllabus.flatMap((item) => {
                const categoryId = categoryMap.get(item.category.trim());
                if (!categoryId) return [];
                return item.topics.map((topicPath) => ({
                    categoryId,
                    path: topicPath.trim(),
                }));
            });
            const leafNames = [
                ...new Set(
                    leafLookups.map((lookup) =>
                        lookup.path.split(">").at(-1)!.trim()
                    )
                ),
            ];
            const existingTopics = await tx.topic.findMany({
                where: { name: { in: leafNames }, isLeaf: true },
                select: { id: true, name: true, categoryId: true },
            });
            const topicLookup = new Map(
                existingTopics.map((topic) => [
                    `${topic.categoryId}|${topic.name}`,
                    topic.id,
                ])
            );

            const exam = await tx.exam.create({
                data: {
                    name: validated.name.trim(),
                    slug,
                    description: validated.description.trim(),
                    duration: validated.duration,
                    totalMarks: validated.totalMarks,
                    categoryNumber,
                    examCategoryId: validated.examCategoryId,
                },
                select: { id: true, slug: true },
            });

            const tagIds: string[] = [];
            for (const name of normalizedTags) {
                const tag = await tx.tag.upsert({
                    where: { name },
                    update: {},
                    create: { name },
                    select: { id: true },
                });
                tagIds.push(tag.id);
            }
            if (tagIds.length > 0) {
                await tx.examsTagsLink.createMany({
                    data: tagIds.map((tagId) => ({ examId: exam.id, tagId })),
                    skipDuplicates: true,
                });
            }

            const syllabusRows = [
                ...new Map(
                    leafLookups
                        .filter((lookup) => lookup.path)
                        .map((lookup) => {
                            const leafName = lookup.path.split(">").at(-1)!.trim();
                            const row = {
                                examId: exam.id,
                                categoryId: lookup.categoryId,
                                topicPath: lookup.path,
                                topicId:
                                    topicLookup.get(
                                        `${lookup.categoryId}|${leafName}`
                                    ) ?? null,
                            };
                            return [row.topicPath, row] as const;
                        })
                ).values(),
            ];
            if (syllabusRows.length > 0) {
                await tx.examSyllabusEntry.createMany({
                    data: syllabusRows,
                    skipDuplicates: true,
                });
            }
            return exam;
        });

        await Promise.all([
            invalidateTag("exams"),
            invalidateTag("examCategories"),
        ]);
        revalidatePath("/library/exam");
        revalidatePath(`/library/exam/${result.slug}`);
        revalidatePath(`/library/category/${validated.examCategoryId}`);
        return { success: true as const, id: result.id, slug: result.slug };
    } catch (error) {
        console.error("Exam creation failed", error);
        return {
            success: false as const,
            error: actionErrorMessage(error, "Unable to create this exam."),
        };
    }
}

export async function updateExam(id: string, data: ExamFormInput) {
    await requireAdmin();
    if (!id) throw new Error("Exam ID required");
    const validated = examSchema.parse(data);
    const slug = makeSlug(validated.name);

    const categoryNames = [
        ...new Set((validated.syllabus ?? []).map((item) => item.category.trim())),
    ] as string[];

    const categoryMap = new Map<string, string>();
    if (categoryNames.length > 0)
    {
        const results = await prisma.$transaction(
            categoryNames.map((name) =>
                prisma.category.upsert({
                    where: { name },
                    update: {},
                    create: { name },
                    select: { id: true, name: true },
                })
            )
        );
        results.forEach((r) => categoryMap.set(r.name, r.id));
    }

    await prisma.$transaction(async (tx) => {
        await tx.exam.update({
            where: { id },
            data: {
                name: validated.name.trim(),
                slug,
                description: validated.description?.trim(),
                duration: validated.duration,
                totalMarks: validated.totalMarks,
                examCategoryId: validated.examCategoryId,
                categoryNumber: validated.categoryNumber ?? null,
            },
        });

        await tx.examsTagsLink.deleteMany({ where: { examId: id } });
        if (validated.tags?.length > 0)
        {
            const tags = await Promise.all(
                validated.tags.map((tagName: string) =>
                    tx.tag.upsert({
                        where: { name: tagName.trim() },
                        update: {},
                        create: { name: tagName.trim() },
                        select: { id: true },
                    })
                )
            );
            await tx.examsTagsLink.createMany({
                data: tags.map((tag) => ({ examId: id, tagId: tag.id })),
                skipDuplicates: true,
            });
        }

        await tx.examSyllabusEntry.deleteMany({ where: { examId: id } });
        const syllabusRows = [];
        for (const item of validated.syllabus ?? [])
        {
            const catId = categoryMap.get(item.category.trim())!;
            for (const topicPath of item.topics)
            {
                const path = topicPath.trim();
                if (!path) continue;
                syllabusRows.push({ examId: id, categoryId: catId, topicPath: path });
            }
        }
        if (syllabusRows.length > 0)
            await tx.examSyllabusEntry.createMany({ data: syllabusRows, skipDuplicates: true });
    });

    await invalidateTag("exams");
    revalidatePath("/library/exam");
    revalidatePath(`/library/exam/${slug}`);
    return { success: true };
}

export async function deleteExam(id: string) {
    await requireAdmin();
    if (!id) throw new Error("Exam ID required");

    const exam = await prisma.exam.findUnique({
        where: { id },
        select: { slug: true, examCategoryId: true },
    });

    try
    {
        await prisma.exam.delete({ where: { id } });
    } catch (error)
    {
        handlePrismaError(error);
    }

    await invalidateTag("exams");
    revalidatePath("/library/exam");
    if (exam?.examCategoryId)
        revalidatePath(`/library/category/${exam.examCategoryId}`);
    redirect("/library/exam");
}
