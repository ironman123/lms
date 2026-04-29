// app/(main)/actions/exam-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { examSchema, ExamFormInput } from "@/types/exam";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { handlePrismaError } from "@/lib/prisma";
import { invalidateTag } from "@/lib/cache";

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

    const leafLookups: { categoryId: string; path: string }[] = [];
    for (const item of validated.syllabus ?? [])
    {
        const catId = categoryMap.get(item.category.trim())!;
        for (const topicPath of item.topics)
            leafLookups.push({ categoryId: catId, path: topicPath.trim() });
    }

    const leafNames = leafLookups.map((l) => l.path.split(">").at(-1)!.trim());
    const existingTopics = await prisma.topic.findMany({
        where: { name: { in: leafNames }, isLeaf: true },
        select: { id: true, name: true, categoryId: true },
    });
    const topicLookup = new Map(
        existingTopics.map((t) => [`${t.categoryId}|${t.name}`, t.id])
    );

    const result = await prisma.$transaction(async (tx) => {
        const exam = await tx.exam.create({
            data: {
                name: validated.name.trim(),
                slug,
                description: validated.description?.trim(),
                duration: validated.duration,
                totalMarks: validated.totalMarks,
                examCategoryId: validated.examCategoryId,
            },
        });

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
                data: tags.map((tag) => ({ examId: exam.id, tagId: tag.id })),
                skipDuplicates: true,
            });
        }

        const syllabusRows = [];
        for (const item of validated.syllabus ?? [])
        {
            const catId = categoryMap.get(item.category.trim())!;
            for (const topicPath of item.topics)
            {
                const path = topicPath.trim();
                if (!path) continue;
                const leafName = path.split(">").at(-1)!.trim();
                syllabusRows.push({
                    examId: exam.id,
                    categoryId: catId,
                    topicPath: path,
                    topicId: topicLookup.get(`${catId}|${leafName}`) ?? null,
                });
            }
        }
        if (syllabusRows.length > 0)
            await tx.examSyllabusEntry.createMany({ data: syllabusRows, skipDuplicates: true });

        return exam;
    });

    await invalidateTag("exams");
    revalidatePath("/library/exam");
    return { success: true, id: result.id };
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