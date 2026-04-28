"use server";

import prisma from "@/lib/prisma"; // Ensure this exports: new PrismaClient()
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { CategoryFormValues } from "@/types/category"; // Import your Zod type
import { categorySchema } from "@/types/category";
import { requireAdmin } from "@/lib/auth";

export async function createCategory(values: CategoryFormValues) {
    await requireAdmin(); // Ensure only admins can create categories
    // 1. Generate slug from name
    const slug = values.name
        .toLowerCase()
        .replace(/[;,|]+/g, '-')     // semicolons/commas → dash
        .replace(/\s+/g, '-')         // spaces → dash
        .replace(/[^\w\-]+/g, '')     // strip everything else
        .replace(/-{2,}/g, '-')       // collapse multiple dashes
        .replace(/^-|-$/g, '')        // trim leading/trailing dashes
        .trim();

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
    revalidateTag("examCategories");
    revalidatePath("/library/category");
    redirect("/library/category");
}

export async function updateCategory(categoryId: string, data: CategoryFormValues) {
    await requireAdmin();
    const validated = categorySchema.parse(data);

    const slug = validated.name
        .toLowerCase()
        .replace(/[;,|]+/g, '-')     // semicolons/commas → dash
        .replace(/\s+/g, '-')         // spaces → dash
        .replace(/[^\w\-]+/g, '')     // strip everything else
        .replace(/-{2,}/g, '-')       // collapse multiple dashes
        .replace(/^-|-$/g, '')        // trim leading/trailing dashes
        .trim();

    await prisma.examCategory.update({
        where: { id: categoryId },
        data: {
            name: validated.name,
            description: validated.description,
            icon: validated.icon,
            color: validated.color,
            image: validated.image,
            slug,
        },
    });

    revalidateTag("examCategories", "max");
    redirect(`/library/category/${slug}`);
}

export async function deleteCategory(categoryId: string) {
    await requireAdmin();
    await prisma.examCategory.delete({ where: { id: categoryId } });
    revalidateTag("examCategories", "max");
    redirect("/library/category");
}