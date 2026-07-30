import { NextRequest, NextResponse } from "next/server";
import { reconcilePendingSessionStats } from "@/lib/session-stats";

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

    const startedAt = performance.now();
    const results = await reconcilePendingSessionStats();
    const failed = results.filter((result) => result.status === "failed");
    const durationMs = Math.round(performance.now() - startedAt);
    console.info(JSON.stringify({
        event: "session_stats_reconciliation",
        processed: results.length - failed.length,
        failed: failed.length,
        durationMs,
    }));

    return NextResponse.json(
        { ok: failed.length === 0, results },
        {
            status: failed.length === 0 ? 200 : 500,
            headers: {
                "Server-Timing": `reconcile;dur=${durationMs}`,
            },
        }
    );
}
