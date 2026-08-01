"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { appFeedbackRatelimit } from "@/lib/ratelimit";
import {
    appFeedbackAcknowledgeSchema,
    appFeedbackAdminUpdateSchema,
    appFeedbackInputSchema,
    type AppFeedbackAdminUpdate,
    type AppFeedbackInput,
} from "@/lib/feedback/schemas";

function revalidateFeedbackViews() {
    revalidatePath("/feedback");
    revalidatePath("/settings/feedback");
    revalidatePath("/admin/feedback");
    revalidatePath("/", "layout");
}

export async function submitAppFeedback(input: AppFeedbackInput) {
    const user = await requireAuth();
    const parsed = appFeedbackInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false as const,
            error: parsed.error.issues[0]?.message ?? "Invalid feedback.",
        };
    }

    try {
        const limit = await appFeedbackRatelimit.limit(user.id);
        if (!limit.success) {
            return {
                success: false as const,
                error: "Too much feedback was submitted recently. Please try later.",
            };
        }
    } catch (error) {
        console.warn("App-feedback Redis limiter unavailable", error);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000);
    const recentCount = await prisma.appFeedback.count({
        where: { reporterId: user.id, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= 5) {
        return {
            success: false as const,
            error: "You have reached the hourly feedback limit.",
        };
    }

    const requestHeaders = await headers();
    const feedback = await prisma.appFeedback.create({
        data: {
            reporterId: user.id,
            category: parsed.data.category,
            title: parsed.data.title,
            message: parsed.data.message,
            pageUrl: parsed.data.pageUrl || null,
            userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
            context: parsed.data.context
                ? (parsed.data.context as Prisma.InputJsonValue)
                : undefined,
        },
        select: { id: true },
    });
    revalidateFeedbackViews();
    return { success: true as const, feedbackId: feedback.id };
}

export async function updateAppFeedback(input: AppFeedbackAdminUpdate) {
    const admin = await requireAdmin();
    const parsed = appFeedbackAdminUpdateSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false as const,
            error: parsed.error.issues[0]?.message ?? "Invalid update.",
        };
    }
    if (parsed.data.assignedToId) {
        const assignee = await prisma.user.findFirst({
            where: {
                id: parsed.data.assignedToId,
                role: { in: ["ADMIN", "CREATOR"] },
            },
            select: { id: true },
        });
        if (!assignee) {
            return { success: false as const, error: "Invalid assignee." };
        }
    }
    const existing = await prisma.appFeedback.findUnique({
        where: { id: parsed.data.feedbackId },
        select: { acknowledgedAt: true },
    });
    if (!existing) {
        return { success: false as const, error: "Feedback ticket not found." };
    }

    const acknowledgesTicket =
        parsed.data.status !== "NEW" && !existing.acknowledgedAt;

    await prisma.appFeedback.update({
        where: { id: parsed.data.feedbackId },
        data: {
            status: parsed.data.status,
            priority: parsed.data.priority,
            assignedToId: parsed.data.assignedToId,
            adminResponse: parsed.data.adminResponse || null,
            acknowledgedAt: acknowledgesTicket ? new Date() : undefined,
            acknowledgedById: acknowledgesTicket ? admin.id : undefined,
            resolvedAt:
                parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
                    ? new Date()
                    : null,
        },
    });
    revalidateFeedbackViews();
    return { success: true as const };
}

export async function acknowledgeAppFeedback(input: { feedbackId: string }) {
    const admin = await requireAdmin();
    const parsed = appFeedbackAcknowledgeSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Invalid feedback ticket." };
    }

    const existing = await prisma.appFeedback.findUnique({
        where: { id: parsed.data.feedbackId },
        select: {
            status: true,
            assignedToId: true,
            acknowledgedAt: true,
        },
    });
    if (!existing) {
        return { success: false as const, error: "Feedback ticket not found." };
    }
    if (existing.status !== "NEW") {
        return { success: true as const, alreadyAcknowledged: true };
    }

    await prisma.appFeedback.update({
        where: { id: parsed.data.feedbackId },
        data: {
            status: "ACKNOWLEDGED",
            acknowledgedAt: existing.acknowledgedAt ?? new Date(),
            acknowledgedById: admin.id,
            assignedToId: existing.assignedToId ?? admin.id,
        },
    });

    revalidateFeedbackViews();
    return { success: true as const, alreadyAcknowledged: false };
}
