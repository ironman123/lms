"use server";

import { requireAdmin, requireAuth } from "@/lib/auth";
import { contentReportRatelimit } from "@/lib/ratelimit";
import {
    createOrUpdateContentReport,
    ModerationReportError,
    withdrawContentReport,
} from "@/lib/moderation/report-service";
import {
    transitionModerationCase,
    updateModerationConfig,
    assignModerationCase,
    mergeModerationCases,
} from "@/lib/moderation/admin-service";
import type {
    ModerationCaseTransitionInput,
    ModerationCaseAssignmentInput,
    ModerationCaseMergeInput,
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
    try {
        const burst = await contentReportRatelimit.limit(user.id);
        if (!burst.success) {
            return {
                success: false,
                error: "Too many report attempts. Please wait a minute and try again.",
            };
        }
    } catch (error) {
        // PostgreSQL still enforces the configurable hourly/daily limits.
        // A Redis outage must not prevent students from reporting bad content.
        console.warn("Content-report burst limiter unavailable", error);
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

export async function changeModerationCaseAssignment(
    input: ModerationCaseAssignmentInput
) {
    const admin = await requireAdmin();
    try {
        const moderationCase = await assignModerationCase(admin.id, input);
        revalidatePath("/admin/moderation");
        revalidatePath(`/admin/moderation/${input.caseId}`);
        return { success: true as const, moderationCase };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to assign this case.",
        };
    }
}

export async function mergeModerationCase(
    input: ModerationCaseMergeInput
) {
    const admin = await requireAdmin();
    try {
        const result = await mergeModerationCases(admin.id, input);
        revalidatePath("/admin/moderation");
        revalidatePath(`/admin/moderation/${input.targetCaseId}`);
        return { success: true as const, ...result };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to merge these cases.",
        };
    }
}

export async function withdrawMyContentReport(reportId: string) {
    const user = await requireAuth();
    try {
        const result = await withdrawContentReport(user.id, reportId);
        revalidatePath("/settings/reports");
        return { success: true as const, ...result };
    } catch (error) {
        if (error instanceof ModerationReportError) {
            return { success: false as const, error: error.message };
        }
        return {
            success: false as const,
            error: "The report could not be withdrawn.",
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
