import { z } from "zod";
import { questionSchema } from "@/types/question";

export const paperImportSourceSchema = z.enum(["JSON", "OCR", "MANUAL"]);

export const paperImportItemSchema = z.object({
    clientId: z.string().trim().min(1).max(200),
    sourceNumber: z.number().int().positive().nullable().optional(),
    position: z.number().int().nonnegative(),
    data: questionSchema,
});

export const paperImportCommandSchema = z
    .object({
        paperId: z.string().uuid(),
        expectedRevision: z.number().int().positive().optional(),
        idempotencyKey: z.string().uuid(),
        source: paperImportSourceSchema,
        sourceFileName: z.string().trim().max(255).nullable().optional(),
        sourceHash: z.string().trim().max(128).nullable().optional(),
        items: z
            .array(paperImportItemSchema)
            .min(1, "At least one question is required")
            .max(500, "A paper import supports at most 500 questions"),
    })
    .superRefine((command, context) => {
        const clientIds = new Set<string>();
        const positions = new Set<number>();

        command.items.forEach((item, index) => {
            if (clientIds.has(item.clientId)) {
                context.addIssue({
                    code: "custom",
                    path: ["items", index, "clientId"],
                    message: "Each imported question needs a unique client ID.",
                });
            }
            clientIds.add(item.clientId);

            if (positions.has(item.position)) {
                context.addIssue({
                    code: "custom",
                    path: ["items", index, "position"],
                    message: "Question positions must be unique.",
                });
            }
            positions.add(item.position);
        });
    });

export type PaperImportCommand = z.input<typeof paperImportCommandSchema>;
export type ValidatedPaperImportCommand = z.output<
    typeof paperImportCommandSchema
>;

export function formatPaperImportIssues(error: z.ZodError) {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));
}
