"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { invalidateKey, invalidateTag } from "@/lib/cache";
import {
    commitPaperImport,
    PaperImportError,
} from "@/lib/paper-import-service";
import type { PaperImportCommand } from "@/lib/paper-authoring";

export async function commitPaperImportAction(command: PaperImportCommand) {
    const admin = await requireAdmin();
    try {
        const result = await commitPaperImport(admin.id, command);
        await Promise.all([
            invalidateKey(`paper:${command.paperId}`),
            invalidateTag("papers"),
            invalidateTag("exams"),
        ]);
        revalidatePath("/library/paper");
        return { success: true as const, ...result };
    } catch (error) {
        if (error instanceof PaperImportError) {
            return {
                success: false as const,
                error: error.message,
                issues: error.issues,
            };
        }
        console.error("Unable to commit paper import", error);
        return {
            success: false as const,
            error: "The imported questions could not be saved.",
            issues: [],
        };
    }
}
