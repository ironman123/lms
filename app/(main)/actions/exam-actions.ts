"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { examSchema } from "@/types/exam";
import { redirect } from "next/navigation";

export async function createExam(data: any) {
    const validated = examSchema.parse(data);

    const slug = validated.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');

    // 1. Upsert all categories up front, build name→id map
    const categoryNames = [...new Set(
        (validated.syllabus ?? []).map((item: any) => item.category.trim())
    )] as string[];

    const categoryMap = new Map<string, string>();

    if (categoryNames.length > 0)
    {
        const results = await prisma.$transaction(
            categoryNames.map(name =>
                prisma.category.upsert({
                    where: { name },
                    update: {},
                    create: { name },
                    select: { id: true, name: true },
                })
            )
        );
        results.forEach(r => categoryMap.set(r.name, r.id));
    }

    // 2. Also resolve topicIds (leaf nodes) for soft-linking — optional but useful
    //    Collect all leaf topic names per category to do one bulk fetch
    const leafLookups: { categoryId: string; path: string }[] = [];
    for (const item of (validated.syllabus ?? []))
    {
        const catId = categoryMap.get(item.category.trim())!;
        for (const topicPath of item.topics)
        {
            leafLookups.push({ categoryId: catId, path: topicPath.trim() });
        }
    }

    // Fetch existing leaf topics so we can attach topicId where possible
    const leafNames = leafLookups.map(l => {
        const parts = l.path.split('>');
        return parts[parts.length - 1].trim();
    });
    const existingTopics = await prisma.topic.findMany({
        where: {
            name: { in: leafNames },
            isLeaf: true,
        },
        select: { id: true, name: true, categoryId: true },
    });
    // name+categoryId → id (good enough for soft link)
    const topicLookup = new Map(
        existingTopics.map(t => [`${t.categoryId}|${t.name}`, t.id])
    );

    // 3. Single transaction — just create exam + entries
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

        // Tags
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
                data: tags.map(tag => ({ examId: exam.id, tagId: tag.id })),
                skipDuplicates: true,
            });
        }

        // Syllabus entries — one row per topic path, that's it
        const syllabusRows = [];
        for (const item of (validated.syllabus ?? []))
        {
            const catName = item.category.trim();
            const catId = categoryMap.get(catName)!;

            for (const topicPath of item.topics)
            {
                const path = topicPath.trim();
                if (!path) continue;

                const leafName = path.split('>').at(-1)!.trim();
                const topicId = topicLookup.get(`${catId}|${leafName}`) ?? null;

                syllabusRows.push({
                    examId: exam.id,
                    categoryId: catId,
                    topicPath: path,
                    topicId,
                });
            }
        }

        if (syllabusRows.length > 0)
        {
            await tx.examSyllabusEntry.createMany({
                data: syllabusRows,
                skipDuplicates: true,
            });
        }

        return exam;
    });

    revalidateTag("exams");
    revalidatePath("/library/exams");
    return { success: true, id: result.id };
}


export async function updateExam(id: string, data: any) {
    const validated = examSchema.parse(data);

    const slug = validated.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');

    // Upsert categories
    const categoryNames = [...new Set(
        (validated.syllabus ?? []).map((item: any) => item.category.trim())
    )] as string[];

    const categoryMap = new Map<string, string>();
    if (categoryNames.length > 0)
    {
        const results = await prisma.$transaction(
            categoryNames.map(name =>
                prisma.category.upsert({
                    where: { name },
                    update: {},
                    create: { name },
                    select: { id: true, name: true },
                })
            )
        );
        results.forEach(r => categoryMap.set(r.name, r.id));
    }

    await prisma.$transaction(async (tx) => {
        // Update exam fields
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

        // Replace tags
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
                data: tags.map(tag => ({ examId: id, tagId: tag.id })),
                skipDuplicates: true,
            });
        }

        // Replace syllabus entries entirely
        await tx.examSyllabusEntry.deleteMany({ where: { examId: id } });
        const syllabusRows = [];
        for (const item of (validated.syllabus ?? []))
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
        {
            await tx.examSyllabusEntry.createMany({
                data: syllabusRows,
                skipDuplicates: true,
            });
        }
    });

    revalidateTag("exams");
    revalidatePath("/library/exams");
    revalidatePath(`/library/exam/${slug}`);
    return { success: true };
}

export async function deleteExam(id: string) {
    const exam = await prisma.exam.findUnique({
        where: { id },
        select: { slug: true, examCategoryId: true }
    });

    await prisma.exam.delete({ where: { id } });

    revalidateTag("exams");
    revalidatePath("/library/exams");
    if (exam?.examCategoryId) revalidatePath(`/library/category/${exam.examCategoryId}`);
    redirect("/library/exams");
}