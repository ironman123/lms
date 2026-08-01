import assert from "node:assert/strict";
import test from "node:test";
import {
    APP_FEEDBACK_STATUS_DESCRIPTIONS,
    APP_FEEDBACK_STATUS_LABELS,
    appFeedbackAcknowledgeSchema,
    appFeedbackAdminUpdateSchema,
    appFeedbackInputSchema,
} from "../lib/feedback/schemas";

test("app feedback accepts product issues independently from content reports", () => {
    const result = appFeedbackInputSchema.safeParse({
        category: "PERFORMANCE",
        title: "Dashboard navigation is slow",
        message: "Opening the next dashboard section takes several seconds.",
        pageUrl: "https://example.test/dashboard",
    });
    assert.equal(result.success, true);
});

test("feedback acknowledgement is a first-class visible state", () => {
    const result = appFeedbackAdminUpdateSchema.safeParse({
        feedbackId: "33333333-3333-4333-8333-333333333333",
        status: "ACKNOWLEDGED",
        priority: "NORMAL",
        assignedToId: null,
        adminResponse: null,
    });
    assert.equal(result.success, true);
    assert.equal(APP_FEEDBACK_STATUS_LABELS.ACKNOWLEDGED, "Acknowledged");
    assert.match(
        APP_FEEDBACK_STATUS_DESCRIPTIONS.ACKNOWLEDGED,
        /received and seen/i
    );
});

test("acknowledgement targets one valid ticket", () => {
    assert.equal(
        appFeedbackAcknowledgeSchema.safeParse({
            feedbackId: "33333333-3333-4333-8333-333333333333",
        }).success,
        true
    );
    assert.equal(
        appFeedbackAcknowledgeSchema.safeParse({ feedbackId: "not-an-id" })
            .success,
        false
    );
});

test("app feedback rejects empty and oversized submissions", () => {
    assert.equal(
        appFeedbackInputSchema.safeParse({
            category: "BUG",
            title: "Bad",
            message: "Short",
        }).success,
        false
    );
    assert.equal(
        appFeedbackInputSchema.safeParse({
            category: "BUG",
            title: "A valid title",
            message: "x".repeat(5_001),
        }).success,
        false
    );
});

test("admin feedback transitions use a bounded lifecycle", () => {
    const result = appFeedbackAdminUpdateSchema.safeParse({
        feedbackId: "33333333-3333-4333-8333-333333333333",
        status: "RESOLVED",
        priority: "HIGH",
        assignedToId: null,
        adminResponse: "The navigation query was optimized.",
    });
    assert.equal(result.success, true);
});
