import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";

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

    // This endpoint used to write final telemetry asynchronously. Submission
    // now persists the authoritative result in its database transaction.
    // Acknowledge old signed deliveries so QStash stops retrying them, but
    // never let stale payloads mutate a completed attempt.
    console.info(JSON.stringify({
        event: "legacy_interaction_delivery_ignored",
        bodyBytes: new TextEncoder().encode(body).byteLength,
    }));
    return NextResponse.json({ ok: true, ignored: true, deprecated: true });
}
