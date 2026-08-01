import assert from "node:assert/strict";
import test from "node:test";
import { resolveSessionExamAttribution } from "../lib/session-attribution";

test("standalone papers are valid but do not affect an exam aggregate", () => {
    assert.deepEqual(resolveSessionExamAttribution([]), {
        status: "resolved",
        examId: null,
        source: "STANDALONE",
    });
});

test("a single linked exam is attributed automatically", () => {
    assert.deepEqual(resolveSessionExamAttribution(["exam-a"]), {
        status: "resolved",
        examId: "exam-a",
        source: "AUTO_SINGLE_LINK",
    });
});

test("multi-exam papers require an explicit selection", () => {
    assert.deepEqual(
        resolveSessionExamAttribution(["exam-a", "exam-b"]),
        {
            status: "requires_selection",
            examIds: ["exam-a", "exam-b"],
        }
    );
    assert.deepEqual(
        resolveSessionExamAttribution(
            ["exam-a", "exam-b"],
            "exam-b"
        ),
        {
            status: "resolved",
            examId: "exam-b",
            source: "EXPLICIT_SELECTION",
        }
    );
});

test("an unlinked or forged exam context is rejected", () => {
    assert.deepEqual(
        resolveSessionExamAttribution(["exam-a"], "exam-forged"),
        { status: "invalid" }
    );
    assert.deepEqual(
        resolveSessionExamAttribution([], "exam-forged"),
        { status: "invalid" }
    );
});

test("duplicate links cannot create a false multi-exam ambiguity", () => {
    assert.deepEqual(
        resolveSessionExamAttribution(["exam-a", "exam-a"]),
        {
            status: "resolved",
            examId: "exam-a",
            source: "AUTO_SINGLE_LINK",
        }
    );
});
