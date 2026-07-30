import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { interactionPayloadSchema } from "@/lib/session-interactions";
import {
    FINAL_INTERACTION_REVISION,
    persistSessionInteractions,
} from "@/lib/interaction-repository";

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
    const body = await req.text();
    let isValid = false;
    try {
        isValid = await receiver.verify({
            signature: req.headers.get("upstash-signature") ?? "",
            body,
        });
    } catch {
        isValid = false;
    }
    if (!isValid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
        json = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = interactionPayloadSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { sessionId, userId, metrics } = parsed.data;
    const result = await persistSessionInteractions({
        sessionId,
        userId,
        metrics,
        checkpointRevision: FINAL_INTERACTION_REVISION,
    });

    if (result.status === "not_found") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, upserted: result.upserted });
}
