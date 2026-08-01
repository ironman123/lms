import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { actionErrorMessage } from "../lib/action-errors";
import { categorySchema } from "../types/category";
import { examSchema } from "../types/exam";
import { paperSchema } from "../types/paper";

test("valid category, exam, and paper creation payloads are accepted", () => {
    assert.equal(
        categorySchema.parse({
            name: "School Level",
            description: "Exams intended for school-level students.",
            icon: "GraduationCap",
            color: "#1D3557",
            image: "",
        }).image,
        "adnan-saifee-zmr9TeA7WjU-unsplash_jpxf7l"
    );
    const exam = examSchema.parse({
        name: "Class 10 Practice",
        examCategoryId: "00000000-0000-4000-8000-000000000001",
        description: "A complete practice exam for class ten students.",
        categoryNumber: "T-10",
        tags: ["school"],
        duration: "60",
        totalMarks: "100",
        syllabus: [{ category: "Mathematics", topics: ["Algebra > Polynomials"] }],
    });
    assert.equal(exam.duration, 60);
    assert.deepEqual(
        paperSchema.parse({
            title: "Class 10 Sample Paper",
            year: "2026",
            type: "PYQ",
            examIds: [
                "00000000-0000-4000-8000-000000000001",
                "00000000-0000-4000-8000-000000000001",
            ],
        }).examIds,
        ["00000000-0000-4000-8000-000000000001"]
    );
});

test("paper creation rejects forged exam identifiers", () => {
    assert.equal(
        paperSchema.safeParse({
            title: "Invalid linked paper",
            year: 2026,
            type: "PYQ",
            examIds: ["not-an-exam-id"],
        }).success,
        false
    );
});

const examAction = readFileSync(
    new URL("../app/(main)/actions/exam-actions.ts", import.meta.url),
    "utf8"
);
const categoryAction = readFileSync(
    new URL("../app/(main)/actions/category-actions.ts", import.meta.url),
    "utf8"
);
const paperAction = readFileSync(
    new URL("../app/(main)/actions/paper-actions.ts", import.meta.url),
    "utf8"
);
const triggerMigration = readFileSync(
    new URL(
        "../prisma/migrations/20260801220000_remove_stale_exam_search_trigger/migration.sql",
        import.meta.url
    ),
    "utf8"
);

test("creation actions validate server input and return useful failures", () => {
    assert.match(examAction, /examSchema\.parse/);
    assert.match(examAction, /actionErrorMessage/);
    assert.match(examAction, /categoryNumber,/);
    assert.match(categoryAction, /categorySchema\.parse/);
    assert.match(categoryAction, /success: false as const/);
    assert.match(paperAction, /paperSchema\.parse/);
    assert.match(paperAction, /actionErrorMessage/);
});

test("exam creation is one transaction and removes the broken search trigger", () => {
    assert.match(examAction, /prisma\.\$transaction\(async \(tx\)/);
    assert.match(triggerMigration, /DROP TRIGGER IF EXISTS "exam_search_update"/);
    assert.match(triggerMigration, /DROP FUNCTION IF EXISTS "exam_search_vector_update"/);
});

test("duplicate category codes are reported without a silent generic failure", () => {
    const error = new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["Exam_categoryNumber_key"] },
    });

    assert.equal(
        actionErrorMessage(error, "fallback"),
        "That category code is already assigned to another exam."
    );
});

test("content actions return structured failures and the builder keeps publish blockers visible", () => {
    assert.match(examAction, /Exam update failed/);
    assert.match(categoryAction, /Category update failed/);
    assert.match(paperAction, /Paper publish failed/);
    assert.match(paperAction, /Paper update failed/);

    const paperBuilder = readFileSync(
        new URL("../components/PaperBuilder.tsx", import.meta.url),
        "utf8"
    );
    assert.match(paperBuilder, /Publishing needs attention/);
    assert.match(paperBuilder, /SUBJECTIVE_REQUIRES_MANUAL_GRADING/);

    const questionCard = readFileSync(
        new URL("../components/QuestionCard.tsx", import.meta.url),
        "utf8"
    );
    assert.match(questionCard, /Manual grading is not available yet/);
});
