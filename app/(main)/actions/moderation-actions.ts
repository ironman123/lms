"use server";

import { requireAdmin, requireAuth } from "@/lib/auth";
import { contentReportRatelimit } from "@/lib/ratelimit";
import {
    createOrUpdateContentReport,
    ModerationReportError,
} from "@/lib/moderation/report-service";
import {
    transitionModerationCase,
    updateModerationConfig,
} from "@/lib/moderation/admin-service";
import type {
    ModerationCaseTransitionInput,
    ModerationConfigInput,
} from "@/lib/moderation/schemas";
import { revalidatePath } from "next/cache";

export type SubmitContentReportResult =
    | {
          success: true;
          reportId: string;
          caseId: string;
          uniqueReporterCount: number;
          escalated: boolean;
      }
    | { success: false; error: string };

export async function submitContentReport(
    input: unknown
): Promise<SubmitContentReportResult> {
    const user = await requireAuth();
    const burst = await contentReportRatelimit.limit(user.id);
    if (!burst.success) {
        return {
            success: false,
            error: "Too many report attempts. Please wait a minute and try again.",
        };
    }

    try {
        const result = await createOrUpdateContentReport(user.id, input);
        return { success: true, ...result };
    } catch (error) {
        if (error instanceof ModerationReportError) {
            return { success: false, error: error.message };
        }
        console.error("Unable to submit content report", error);
        return {
            success: false,
            error: "The report could not be saved. Please try again.",
        };
    }
}

export async function saveModerationConfig(input: ModerationConfigInput) {
    const admin = await requireAdmin();
    try {
        const config = await updateModerationConfig(admin.id, input);
        revalidatePath("/admin/moderation");
        revalidatePath("/admin/settings/moderation");
        return { success: true as const, config };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to update moderation settings.",
        };
    }
}

export async function changeModerationCaseStatus(
    input: ModerationCaseTransitionInput
) {
    const admin = await requireAdmin();
    try {
        const moderationCase = await transitionModerationCase(admin.id, input);
        revalidatePath("/admin/moderation");
        revalidatePath(`/admin/moderation/${input.caseId}`);
        return { success: true as const, moderationCase };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to update this moderation case.",
        };
    }
}
