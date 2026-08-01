import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sessionActions = readFileSync(
    new URL(
        "../app/(main)/actions/session-actions.ts",
        import.meta.url
    ),
    "utf8"
);
const mistakeProjection = readFileSync(
    new URL("../lib/mistake-notebook.ts", import.meta.url),
    "utf8"
);

test("submission transaction accepts the same non-expiring sessions as validation", () => {
    assert.match(
        sessionActions,
        /OR:\s*\[\s*\{ expiresAt: null \},\s*\{ expiresAt: \{ gt: expiryGraceCutoff \} \}/
    );
});

test("mistake review timestamps are explicitly typed for PostgreSQL", () => {
    assert.match(mistakeProjection, /wrongReviewAt\}::timestamp\(3\)/);
    assert.match(mistakeProjection, /correctReviewAt\}::timestamp\(3\)/);
    assert.match(mistakeProjection, /occurredAt\}::timestamp\(3\)/);
});
