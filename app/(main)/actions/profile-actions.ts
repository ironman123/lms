
// app/(main)/actions/profile-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { invalidateKey, invalidateTag } from "@/lib/cache";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
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
        },
    });

    // Bust cached user so navbar and requireAuth pick up changes immediately
    await invalidateKey(`user:${user.supabaseId}`);
    await invalidateTag(`notifications:user:${user.id}`);
    revalidatePath("/settings");

    return { success: true };
}
