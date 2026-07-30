import { z } from "zod";

export const REPORT_CATEGORIES = [
    "WRONG_ANSWER_KEY",
    "AMBIGUOUS_QUESTION",
    "INVALID_OPTIONS",
    "TYPO_OR_FORMATTING",
    "INCORRECT_EXPLANATION",
    "MISSING_OR_BROKEN_IMAGE",
    "TRANSLATION_ISSUE",
    "OUT_OF_SYLLABUS",
    "DUPLICATE_QUESTION",
    "WRONG_PAPER_DETAILS",
    "INCOMPLETE_PAPER",
    "OTHER",
] as const;

export const REPORT_CATEGORY_LABELS: Record<
    (typeof REPORT_CATEGORIES)[number],
    string
> = {
    WRONG_ANSWER_KEY: "Incorrect answer key",
    AMBIGUOUS_QUESTION: "Question is ambiguous",
    INVALID_OPTIONS: "Duplicate or invalid options",
    TYPO_OR_FORMATTING: "Typo or formatting issue",
    INCORRECT_EXPLANATION: "Incorrect explanation",
    MISSING_OR_BROKEN_IMAGE: "Missing or broken image",
    TRANSLATION_ISSUE: "Translation issue",
    OUT_OF_SYLLABUS: "Outside the paper syllabus",
    DUPLICATE_QUESTION: "Duplicate question",
    WRONG_PAPER_DETAILS: "Incorrect paper title or details",
    INCOMPLETE_PAPER: "Paper is incomplete",
    OTHER: "Other issue",
};

const reportBaseSchema = z.object({
    category: z.enum(REPORT_CATEGORIES),
    comment: z.string().trim().max(5_000).optional().default(""),
});

export const contentReportInputSchema = z.discriminatedUnion("targetType", [
    reportBaseSchema.extend({
        targetType: z.literal("QUESTION"),
        questionId: z.string().uuid(),
        sessionId: z.string().uuid(),
        source: z.enum(["ACTIVE_SESSION", "RESULT_REVIEW"]),
    }),
    reportBaseSchema.extend({
        targetType: z.literal("PAPER"),
        paperId: z.string().uuid(),
        source: z.literal("PAPER_PAGE"),
    }),
]);

export const moderationConfigInputSchema = z
    .object({
        questionReportThreshold: z.number().int().min(1).max(1_000),
        paperReportThreshold: z.number().int().min(1).max(1_000),
        reportLimitPerHour: z.number().int().min(1).max(1_000),
        reportLimitPerDay: z.number().int().min(1).max(10_000),
        maxCommentLength: z.number().int().min(1).max(5_000),
    })
    .refine(
        (value) => value.reportLimitPerDay >= value.reportLimitPerHour,
        {
            message:
                "The daily report limit must be at least the hourly limit.",
            path: ["reportLimitPerDay"],
        }
    );

export const moderationCaseTransitionSchema = z.object({
    caseId: z.string().uuid(),
    status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
    note: z.string().trim().max(5_000).optional().default(""),
});

export const moderationCaseAssignmentSchema = z.object({
    caseId: z.string().uuid(),
    assigneeId: z.string().uuid().nullable(),
});

export const moderationCaseMergeSchema = z.object({
    sourceCaseId: z.string().uuid(),
    targetCaseId: z.string().uuid(),
});

export type ContentReportInput = z.infer<typeof contentReportInputSchema>;
export type ReportCategoryValue = (typeof REPORT_CATEGORIES)[number];
export type ModerationConfigInput = z.infer<
    typeof moderationConfigInputSchema
>;
export type ModerationCaseTransitionInput = z.infer<
    typeof moderationCaseTransitionSchema
>;
export type ModerationCaseAssignmentInput = z.infer<
    typeof moderationCaseAssignmentSchema
>;
export type ModerationCaseMergeInput = z.infer<
    typeof moderationCaseMergeSchema
>;
