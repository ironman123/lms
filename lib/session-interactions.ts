import { z } from "zod";

export const submittedInteractionMetricSchema = z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.string().max(10_000).nullable(),
    visitCount: z.number().int().min(0).max(1_000_000),
    dwellTimeSeconds: z.number().int().min(0).max(31_536_000),
    hesitationCount: z.number().int().min(0).max(1_000_000),
    isFlagged: z.boolean(),
    isCorrect: z.boolean().nullable(),
    wasHinted: z.boolean(),
    confidenceLevel: z.number().int().min(0).max(100).nullable(),
});

export const submittedInteractionMetricsSchema = z
    .array(submittedInteractionMetricSchema)
    .max(1_000);

export const checkpointPayloadSchema = z.object({
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    metrics: submittedInteractionMetricsSchema,
});

export const interactionPayloadSchema = z.object({
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    metrics: z.array(
        z.object({
            questionId: z.string().uuid(),
            selectedAnswer: z.string().max(10_000).nullable(),
            isCorrect: z.boolean(),
            visitCount: z.number().int().min(0).max(1_000_000),
            dwellTimeSeconds: z.number().int().min(0).max(31_536_000),
            hesitationCount: z.number().int().min(0).max(1_000_000),
            isFlagged: z.boolean(),
            wasHinted: z.boolean(),
            confidenceLevel: z
                .number()
                .int()
                .min(0)
                .max(100)
                .nullable()
                .optional()
                .default(null),
        })
    ).max(1_000),
});

export type InteractionPayload = z.infer<typeof interactionPayloadSchema>;
export type SubmittedInteractionMetric = z.infer<
    typeof submittedInteractionMetricSchema
>;

export type RestoredInteraction = SubmittedInteractionMetric & {
    checkpointRevision: number;
};
