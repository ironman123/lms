import assert from "node:assert/strict";
import test from "node:test";
import { paperImportCommandSchema } from "../lib/paper-authoring";

const paperId = "11111111-1111-4111-8111-111111111111";
const idempotencyKey = "22222222-2222-4222-8222-222222222222";

function question(clientId: string, position: number) {
    return {
        clientId,
        position,
        sourceNumber: position + 1,
        data: {
            content: `Question ${position + 1}`,
            type: "MCQ" as const,
            difficulty: "MEDIUM" as const,
            marks: 1,
            negativeMarks: 0,
            isCancelled: false,
            options: [
                { index: 0, text: "Correct" },
                { index: 1, text: "Incorrect" },
            ],
            correctOptions: [0],
        },
    };
}

test("a complete paper import command is accepted", () => {
    const result = paperImportCommandSchema.safeParse({
        paperId,
        idempotencyKey,
        source: "JSON",
        items: [question("q-1", 0), question("q-2", 1)],
    });
    assert.equal(result.success, true);
});

test("paper imports reject duplicate client IDs", () => {
    const result = paperImportCommandSchema.safeParse({
        paperId,
        idempotencyKey,
        source: "JSON",
        items: [question("duplicate", 0), question("duplicate", 1)],
    });
    assert.equal(result.success, false);
    assert.match(result.error?.issues[0]?.message ?? "", /unique client ID/i);
});

test("paper imports reject duplicate positions", () => {
    const result = paperImportCommandSchema.safeParse({
        paperId,
        idempotencyKey,
        source: "OCR",
        items: [question("q-1", 0), question("q-2", 0)],
    });
    assert.equal(result.success, false);
    assert.match(result.error?.issues[0]?.message ?? "", /positions must be unique/i);
});
