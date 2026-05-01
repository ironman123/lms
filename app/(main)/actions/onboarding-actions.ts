// app/(main)/actions/onboarding-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { invalidateKey } from "@/lib/cache";
import { redirect } from "next/navigation";

export async function completeOnboarding(data: {
    name: string;
    targetExams: string[];
    college?: string;
    region?: string;
}) {
    const user = await requireAuth();

    if (!data.name?.trim())
    {
        return { success: false, error: "Name is required." };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            name: data.name.trim(),
            targetExams: data.targetExams,
            college: data.college?.trim() || null,
            region: data.region?.trim() || null,
            onboarded: true,
        },
    });

    // Bust the user cache so requireAuth picks up onboarded: true immediately
    await invalidateKey(`user:${user.supabaseId}`);

    redirect("/dashboard");
}

// Fetch all exams for the exam picker — cached upstream in the page
export async function getExamsForPicker() {
    return prisma.exam.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            examCategory: { select: { name: true } },
        },
        orderBy: { name: "asc" },
    });
}