import { z } from "zod";

export const APP_FEEDBACK_CATEGORIES = [
    "BUG",
    "UX",
    "FEATURE_REQUEST",
    "PERFORMANCE",
    "ACCESSIBILITY",
    "GENERAL",
] as const;

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
    status: z.enum(["NEW", "IN_REVIEW", "PLANNED", "RESOLVED", "CLOSED"]),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
    assignedToId: z.string().uuid().nullable(),
    adminResponse: z.string().trim().max(5_000).nullable(),
});

export type AppFeedbackInput = z.input<typeof appFeedbackInputSchema>;
export type AppFeedbackAdminUpdate = z.input<
    typeof appFeedbackAdminUpdateSchema
>;
