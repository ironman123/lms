import { NextRequest, NextResponse } from "next/server";
import { reconcilePendingSessionStats } from "@/lib/session-stats";
import { runInteractionRetention } from "@/lib/interaction-retention";
import { reconcilePendingQuestionAnalytics } from "@/lib/question-analytics";
import {
    acquireMaintenanceLease,
    releaseMaintenanceLease,
} from "@/lib/maintenance-lease";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            { error: "CRON_SECRET is not configured" },
            { status: 503 }
        );
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const holderId = await acquireMaintenanceLease("session-lifecycle");
    if (!holderId) {
        return NextResponse.json(
            { ok: true, status: "already_running" },
            { status: 202 }
        );
    }

    const startedAt = performance.now();
    try {
        const [stats, questionAnalytics] = await Promise.all([
            reconcilePendingSessionStats(),
            reconcilePendingQuestionAnalytics(),
        ]);
        const statsFailed = stats.filter((result) => result.status === "failed");
        const analyticsFailed = questionAnalytics.filter(
            (result) => result.status === "failed"
        );
        const failed = statsFailed.length + analyticsFailed.length;
        const retention =
            failed === 0
                ? await runInteractionRetention()
                : { status: "skipped_after_projection_failure" as const };
        const durationMs = Math.round(performance.now() - startedAt);
        console.info(JSON.stringify({
            event: "session_lifecycle_reconciliation",
            statsProcessed: stats.length - statsFailed.length,
            analyticsProcessed: questionAnalytics.length - analyticsFailed.length,
            failed,
            durationMs,
            retention,
        }));

        return NextResponse.json(
            { ok: failed === 0, stats, questionAnalytics, retention },
            {
                status: failed === 0 ? 200 : 500,
                headers: { "Server-Timing": `reconcile;dur=${durationMs}` },
            }
        );
    } finally {
        await releaseMaintenanceLease("session-lifecycle", holderId);
    }
}
