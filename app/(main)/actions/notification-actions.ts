// app/(main)/actions/notification-actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { withCache, invalidateTag } from "@/lib/cache";
import { revalidatePath } from "next/cache";
import { enqueueNotificationDelivery } from "@/lib/notification-delivery";

const NOTIF_CACHE_KEY = "notifications:recent";
const NOTIF_TTL = 3600; // 1 hour
const SEEN_KEY = (userId: string) => `notif:seen:${userId}`;
const SEEN_TTL = 60 * 60 * 24 * 30; // 30 days

// ── Admin: send a notification ────────────────────────────────────────────────
export async function sendNotification(data: {
    title: string;
    body: string;
    url?: string;
    examId?: string;
    type: "EXAM_DATE" | "NEW_MOCK" | "RESULT" | "GENERAL";
}) {
    await requireAdmin();

    const notification = await prisma.notification.create({
        data: {
            title: data.title.trim(),
            body: data.body.trim(),
            url: data.url?.trim() || null,
            examId: data.examId || null,
            type: data.type,
        },
    });

    // Bust the cache so the bell picks up the new notification immediately
    await invalidateTag("notifications");

    // The notification is durable before it is queued. If QStash is down,
    // it remains QUEUED and can be retried safely by the delivery worker.
    const queue = await enqueueNotificationDelivery(notification.id).catch(() => ({ queued: false as const, reason: "queue_failed" as const }));

    revalidatePath("/library/notifications");
    return { success: true, id: notification.id, queued: queue.queued };
}

// ── Bell: read recent notifications (cached) ──────────────────────────────────
// Returns the 10 most recent notifications — used by the bell dropdown.
// Cached in Redis for 1 hour, tagged "notifications" so sendNotification busts it.
export async function getRecentNotifications() {
    return withCache(
        NOTIF_CACHE_KEY,
        NOTIF_TTL,
        () =>
            prisma.notification.findMany({
                where: { status: "COMPLETED" },
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    body: true,
                    url: true,
                    type: true,
                    createdAt: true,
                    examId: true,
                },
            }),
        ["notifications"]
    );
}

// ── Bell: mark all notifications seen for this user ───────────────────────────
// Writes a timestamp to Redis — zero DB writes.
// The bell reads this timestamp client-side to decide whether to show the dot.
export async function markNotificationsSeen() {
    const user = await requireAuth();
    await redis.set(SEEN_KEY(user.id), new Date().toISOString(), {
        ex: SEEN_TTL,
    });
    return { success: true };
}

// ── Bell: get the last-seen timestamp for a user ──────────────────────────────
export async function getNotificationSeenAt(userId: string): Promise<string | null> {
    try
    {
        return await redis.get<string>(SEEN_KEY(userId));
    } catch
    {
        return null;
    }
}
