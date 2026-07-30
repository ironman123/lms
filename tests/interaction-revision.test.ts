import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyInteractionRevision } from "../lib/interaction-revision";

test("only a strictly newer checkpoint can replace an interaction", () => {
    assert.equal(shouldApplyInteractionRevision(4, 5), true);
    assert.equal(shouldApplyInteractionRevision(5, 5), false);
    assert.equal(shouldApplyInteractionRevision(6, 5), false);
});

test("nothing can overwrite the final interaction revision", () => {
    assert.equal(
        shouldApplyInteractionRevision(
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER
        ),
        false
    );
});
