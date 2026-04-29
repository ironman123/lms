// app/(main)/actions/category-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CategoryFormValues, categorySchema } from "@/types/category";
import { requireAdmin } from "@/lib/auth";
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

export async function createCategory(values: CategoryFormValues) {
    await requireAdmin();
    const slug = makeSlug(values.name);

    try
    {
        await prisma.examCategory.create({
            data: {
                name: values.name,
                slug,
                description: values.description,
                icon: values.icon,
                color: values.color,
                image: values.image,
            },
        });
    } catch (error)
    {
        console.error("Database Error:", error);
        throw new Error("Failed to create category.");
    }

    await invalidateTag("examCategories");
    revalidatePath("/library/category");
    redirect("/library/category");
}

export async function updateCategory(categoryId: string, data: CategoryFormValues) {
    await requireAdmin();
    const validated = categorySchema.parse(data);
    const slug = makeSlug(validated.name);

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

    await invalidateTag("examCategories");
    redirect(`/library/category/${slug}`);
}

export async function deleteCategory(categoryId: string) {
    await requireAdmin();
    await prisma.examCategory.delete({ where: { id: categoryId } });
    await invalidateTag("examCategories");
    redirect("/library/category");
}