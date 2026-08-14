import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processSessionStatsContribution } from "@/lib/session-stats";
import { processSessionQuestionAnalytics } from "@/lib/question-analytics";

const payloadSchema = z.object({
    sessionId: z.string().uuid(),
});

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
    const body = await req.text();
    let valid = false;
    try {
        valid = await receiver.verify({
            signature: req.headers.get("upstash-signature") ?? "",
            body,
        });
    } catch {
        valid = false;
    }
    if (!valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let parsed;
    try {
        parsed = payloadSchema.safeParse(JSON.parse(body));
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const [stats, questionAnalytics] = await Promise.all([
        processSessionStatsContribution(parsed.data.sessionId),
        processSessionQuestionAnalytics(parsed.data.sessionId),
    ]);
    return NextResponse.json({ ok: true, stats, questionAnalytics });
}
