// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const user = await requireAuth();
    const { endpoint, keys } = await req.json();

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