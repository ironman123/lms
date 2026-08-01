// app/(main)/actions/category-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CategoryFormValues, categorySchema } from "@/types/category";
import { requireAdmin } from "@/lib/auth";
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

export async function createCategory(values: CategoryFormValues) {
    await requireAdmin();
    try {
        const validated = categorySchema.parse(values);
        const slug = makeSlug(validated.name);
        if (!slug) {
            return { success: false as const, error: "Category name must contain letters or numbers." };
        }
        const category = await prisma.examCategory.create({
            data: {
                name: validated.name.trim(),
                slug,
                description: validated.description.trim(),
                icon: validated.icon.trim(),
                color: validated.color,
                image: validated.image,
            },
            select: { id: true, slug: true },
        });
        await invalidateTag("examCategories");
        revalidatePath("/library/category");
        revalidatePath(`/library/category/${category.slug}`);
        return { success: true as const, ...category };
    } catch (error) {
        console.error("Category creation failed", error);
        return {
            success: false as const,
            error: actionErrorMessage(error, "Unable to create this category."),
        };
    }
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
