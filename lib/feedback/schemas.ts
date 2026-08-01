import { z } from "zod";

export const APP_FEEDBACK_CATEGORIES = [
    "BUG",
    "UX",
    "FEATURE_REQUEST",
    "PERFORMANCE",
    "ACCESSIBILITY",
    "GENERAL",
] as const;

export const APP_FEEDBACK_STATUSES = [
    "NEW",
    "ACKNOWLEDGED",
    "IN_REVIEW",
    "PLANNED",
    "RESOLVED",
    "CLOSED",
] as const;

export const APP_FEEDBACK_STATUS_LABELS: Record<
    (typeof APP_FEEDBACK_STATUSES)[number],
    string
> = {
    NEW: "Sent",
    ACKNOWLEDGED: "Acknowledged",
    IN_REVIEW: "In review",
    PLANNED: "Planned",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
};

export const APP_FEEDBACK_STATUS_DESCRIPTIONS: Record<
    (typeof APP_FEEDBACK_STATUSES)[number],
    string
> = {
    NEW: "Waiting for the team to review it.",
    ACKNOWLEDGED: "The team has received and seen it.",
    IN_REVIEW: "The team is investigating or discussing it.",
    PLANNED: "A change has been accepted for future work.",
    RESOLVED: "The reported issue or request has been addressed.",
    CLOSED: "No further action is currently planned.",
};

export const APP_FEEDBACK_CATEGORY_LABELS: Record<
    (typeof APP_FEEDBACK_CATEGORIES)[number],
    string
> = {
    BUG: "Something is broken",
    UX: "Confusing or difficult to use",
    FEATURE_REQUEST: "Feature request",
    PERFORMANCE: "Slow or unresponsive",
    ACCESSIBILITY: "Accessibility problem",
    GENERAL: "General feedback",
};

export const appFeedbackInputSchema = z.object({
    category: z.enum(APP_FEEDBACK_CATEGORIES),
    title: z.string().trim().min(5).max(120),
    message: z.string().trim().min(10).max(5_000),
    pageUrl: z.string().trim().max(2_000).nullable().optional(),
    context: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const appFeedbackAdminUpdateSchema = z.object({
    feedbackId: z.string().uuid(),
    status: z.enum(APP_FEEDBACK_STATUSES),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
    assignedToId: z.string().uuid().nullable(),
    adminResponse: z.string().trim().max(5_000).nullable(),
});

export const appFeedbackAcknowledgeSchema = z.object({
    feedbackId: z.string().uuid(),
});

export type AppFeedbackInput = z.input<typeof appFeedbackInputSchema>;
export type AppFeedbackAdminUpdate = z.input<
    typeof appFeedbackAdminUpdateSchema
>;
