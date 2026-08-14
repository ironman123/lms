import "server-only";

import prisma from "@/lib/prisma";
import { qstash } from "@/lib/qstash";
import { webpush } from "@/lib/webpush";

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 4;

function appOrigin() {
    return process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
}

function errorMessage(error: unknown) {
    return (error instanceof Error ? error.message : String(error)).slice(0, 1_000);
}

export async function enqueueNotificationDelivery(notificationId: string) {
    const origin = appOrigin();
    if (!origin || !process.env.QSTASH_TOKEN) return { queued: false as const, reason: "queue_unavailable" as const };
    await qstash.publishJSON({
        url: `${origin}/api/queues/push`,
        body: { notificationId },
        retries: 3,
    });
    return { queued: true as const };
}

async function ensureDeliveries(notificationId: string) {
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { id: true, examId: true },
    });
    if (!notification) return null;

    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            user: {
                notificationPreferences: { is: { pushEnabled: true } },
                ...(notification.examId
                    ? {
                    OR: [
                        { targetExams: { has: notification.examId } },
                        { purchases: { some: { status: "PAID", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], bundle: { examId: notification.examId } } } },
                    ],
                    }
                    : {}),
            },
        },
        select: { id: true, endpoint: true },
    });

    if (subscriptions.length > 0) {
        await prisma.notificationDelivery.createMany({
            data: subscriptions.map((subscription) => ({
                notificationId,
                subscriptionId: subscription.id,
                endpoint: subscription.endpoint,
            })),
            skipDuplicates: true,
        });
    }
    return notification;
}

/** Processes one bounded batch. Repeated signed deliveries safely resume it. */
export async function processNotificationDeliveryBatch(notificationId: string) {
    const notification = await ensureDeliveries(notificationId);
    if (!notification) return { status: "not_found" as const, remaining: 0 };

    await prisma.notification.updateMany({
        where: { id: notificationId, status: { in: ["QUEUED", "FAILED"] } },
        data: { status: "SENDING" },
    });

    const deliveries = await prisma.notificationDelivery.findMany({
        where: { notificationId, status: { in: ["PENDING", "RETRYABLE"] }, attempts: { lt: MAX_ATTEMPTS } },
        take: BATCH_SIZE,
        orderBy: { createdAt: "asc" },
        include: { subscription: { select: { p256dh: true, auth: true } } },
    });
    const full = await prisma.notification.findUniqueOrThrow({
        where: { id: notificationId }, select: { title: true, body: true, url: true },
    });
    const payload = JSON.stringify({ title: full.title, body: full.body, url: full.url ?? "/dashboard" });

    await Promise.all(deliveries.map(async (delivery) => {
        try {
            await webpush.sendNotification({ endpoint: delivery.endpoint, keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth } }, payload);
            await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", attempts: { increment: 1 }, deliveredAt: new Date(), lastError: null } });
        } catch (error: unknown) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            const expired = statusCode === 404 || statusCode === 410;
            const attempts = delivery.attempts + 1;
            await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: expired ? "EXPIRED" : attempts >= MAX_ATTEMPTS ? "FAILED" : "RETRYABLE", attempts: { increment: 1 }, lastError: errorMessage(error) } });
            if (expired) await prisma.pushSubscription.deleteMany({ where: { id: delivery.subscriptionId } });
        }
    }));

    const [remaining, failed] = await Promise.all([
        prisma.notificationDelivery.count({ where: { notificationId, status: { in: ["PENDING", "RETRYABLE"] }, attempts: { lt: MAX_ATTEMPTS } } }),
        prisma.notificationDelivery.count({ where: { notificationId, status: "FAILED" } }),
    ]);
    if (remaining > 0) {
        await enqueueNotificationDelivery(notificationId).catch(() => undefined);
        return { status: "processing" as const, remaining };
    }
    await prisma.notification.update({ where: { id: notificationId }, data: { status: failed > 0 ? "FAILED" : "COMPLETED", sentAt: new Date() } });
    return { status: failed > 0 ? "failed" as const : "completed" as const, remaining: 0 };
}

/** Scheduled safety net for notifications left queued by an outage or timeout. */
export async function reconcileNotificationDeliveries(limit = 10) {
    const notifications = await prisma.notification.findMany({
        where: { status: { in: ["QUEUED", "SENDING"] } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: Math.min(Math.max(limit, 1), 50),
    });
    const results: Array<{ notificationId: string; status: string }> = [];
    for (const notification of notifications) {
        try {
            const result = await processNotificationDeliveryBatch(notification.id);
            results.push({ notificationId: notification.id, status: result.status });
        } catch (error) {
            results.push({ notificationId: notification.id, status: `failed:${errorMessage(error)}` });
        }
    }
    return results;
}
