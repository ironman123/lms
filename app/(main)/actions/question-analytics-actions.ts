"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { runQuestionAnalyticsBackfill } from "@/lib/question-analytics";

export async function runQuestionAnalyticsBackfillAction(dryRun: boolean) {
    await requireAdmin();
    const result = await runQuestionAnalyticsBackfill({ dryRun, batchSize: 100 });
    revalidatePath("/admin/content-health");
    revalidatePath("/admin/content-health/questions");
    return result;
}
