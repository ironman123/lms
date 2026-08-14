// app/api/queues/push/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { z } from "zod";
import { processNotificationDeliveryBatch } from "@/lib/notification-delivery";

export const dynamic = "force-dynamic";

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
    const body = await req.text();
    let isValid = false;
    try { isValid = await receiver.verify({ signature: req.headers.get("upstash-signature") ?? "", body }); } catch { isValid = false; }
    if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const parsed = z.object({ notificationId: z.string().uuid() }).safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    try {
        const result = await processNotificationDeliveryBatch(parsed.data.notificationId);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error("notification delivery batch failed", error);
        return NextResponse.json({ error: "Delivery failed" }, { status: 500 });
    }
}
