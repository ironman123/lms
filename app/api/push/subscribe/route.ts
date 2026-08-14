// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const subscriptionSchema = z.object({
    endpoint: z.string().url().max(2_000),
    keys: z.object({ p256dh: z.string().min(1).max(1_000), auth: z.string().min(1).max(1_000) }),
});

export async function POST(req: NextRequest) {
    const user = await requireAuth();
    let payload: unknown;
    try { payload = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const parsed = subscriptionSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    const { endpoint, keys } = parsed.data;

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } });
    if (existing && existing.userId !== user.id) {
        return NextResponse.json({ error: "This browser subscription belongs to another account. Sign out there before subscribing here." }, { status: 409 });
    }

    await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth },
        create: {
            userId: user.id,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        },
    });

    return NextResponse.json({ ok: true });
}
