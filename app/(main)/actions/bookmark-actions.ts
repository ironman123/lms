"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const questionIdSchema = z.string().uuid();

export async function toggleQuestionBookmark(questionId: string) {
    const parsed = questionIdSchema.safeParse(questionId);
    if (!parsed.success) return { success: false as const, error: "Invalid question." };
    const user = await requireAuth();
    const existing = await prisma.userQuestionBookmark.findUnique({
        where: { userId_questionId: { userId: user.id, questionId: parsed.data } },
        select: { id: true },
    });
    if (existing) {
        await prisma.userQuestionBookmark.delete({ where: { id: existing.id } });
        revalidatePath("/bookmarks");
        return { success: true as const, bookmarked: false };
    }
    const question = await prisma.question.findFirst({
        where: { id: parsed.data, isArchived: false, isCancelled: false },
        select: { id: true },
    });
    if (!question) return { success: false as const, error: "Question is unavailable." };
    await prisma.userQuestionBookmark.create({ data: { userId: user.id, questionId: question.id } });
    revalidatePath("/bookmarks");
    return { success: true as const, bookmarked: true };
}

export async function getQuestionBookmarks() {
    const user = await requireAuth();
    return prisma.userQuestionBookmark.findMany({
        where: { userId: user.id, question: { isArchived: false } },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true, createdAt: true, note: true,
            question: { select: { id: true, content: true, type: true, paper: { select: { id: true, title: true } } } },
        },
    });
}
