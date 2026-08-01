"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
    runInteractionRetention,
    updateInteractionRetentionConfig,
} from "@/lib/interaction-retention";
import type { InteractionRetentionConfigInput } from "@/lib/interaction-retention-policy";

export async function saveInteractionRetentionConfig(
    input: InteractionRetentionConfigInput
) {
    const admin = await requireAdmin();
    try {
        const config = await updateInteractionRetentionConfig(admin.id, input);
        revalidatePath("/admin/settings/retention");
        return { success: true as const, config };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to save retention settings.",
        };
    }
}

export async function runInteractionRetentionNow(dryRun: boolean) {
    await requireAdmin();
    try {
        const result = await runInteractionRetention({ dryRun });
        revalidatePath("/admin/settings/retention");
        return { success: true as const, result };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to run interaction retention.",
        };
    }
}
