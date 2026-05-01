// app/api/queues/push/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import prisma from "@/lib/prisma";
import { webpush } from "@/lib/webpush";

export const dynamic = "force-dynamic";

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
    const body = await req.text();
    const isValid = await receiver.verify({
        signature: req.headers.get("upstash-signature") ?? "",
        body,
    });
    if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationId } = JSON.parse(body);

    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
    });
    if (!notification) return NextResponse.json({ ok: true });

    // Get target subscribers
    // app/api/queues/push/route.ts — replace the subs query block
    const subs = notification.examId
        ? await prisma.pushSubscription.findMany({
            where: {
                user: {
                    OR: [
                        // paid subscribers for this exam
                        {
                            purchases: {
                                some: {
                                    status: "PAID",
                                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                                    bundle: { examId: notification.examId },
                                },
                            },
                        },
                        // users who added this exam as a target (free or paid)
                        {
                            targetExams: { has: notification.examId },
                        },
                    ],
                },
            },
        })
        : await prisma.pushSubscription.findMany();
    const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        url: notification.url ?? "/dashboard",
    });

    const results = await Promise.allSettled(
        subs.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
            )
        )
    );

    // Clean up dead subscriptions (410 Gone)
    const deadEndpoints = subs
        .filter((_, i) => {
            const r = results[i];
            return r.status === "rejected" && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
        })
        .map(s => s.endpoint);

    if (deadEndpoints.length > 0)
    {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: deadEndpoints } },
        });
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { sentAt: new Date() },
    });

    return NextResponse.json({ ok: true, sent: subs.length });
}