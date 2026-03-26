"use server";

import prisma from "@/lib/prisma"; // Ensure this exports: new PrismaClient()
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CategoryFormValues } from "@/types/category"; // Import your Zod type

export async function createCategory(values: CategoryFormValues) {
    // 1. Generate slug from name
    const slug = values.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');

    try
    {
        // 2. Save to Supabase via Prisma
        await prisma.examCategory.create({
            data: {
                name: values.name,
                slug: slug,
                description: values.description,
                icon: values.icon,
                color: values.color,
                image: values.image, // The Cloudinary Public ID
            },
        });

    } catch (error)
    {
        console.error("Database Error:", error);
        throw new Error("Failed to create category.");
    }

    // 3. Refresh & Redirect
    revalidateTag("examCategories", "layout");
    revalidatePath("/library/category");
    redirect("/library/category");
}