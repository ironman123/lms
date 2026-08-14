import assert from "node:assert/strict";
import test from "node:test";
import {
    appendQuestion,
    removeQuestionByClientId,
    updateQuestionByClientId,
} from "../lib/question-list-state";

type Draft = {
    clientId: string;
    number: number;
    content: string;
};

const initial: Draft[] = [
    { clientId: "a", number: 1, content: "A" },
    { clientId: "b", number: 2, content: "B" },
    { clientId: "c", number: 3, content: "C" },
];

test("removing a question targets its stable client ID, not its rendered index", () => {
    const afterDelete = removeQuestionByClientId(initial, "b");
    assert.deepEqual(
        afterDelete.map((question) => [question.clientId, question.number]),
        [["a", 1], ["c", 2]]
    );

    const afterAdd = appendQuestion(afterDelete, {
        clientId: "d",
        number: 99,
        content: "D",
    });
    const afterEdit = updateQuestionByClientId(afterAdd, "c", {
        ...afterAdd[1],
        content: "C updated",
    });

    assert.deepEqual(
        afterEdit.map((question) => [question.clientId, question.number, question.content]),
        [["a", 1, "A"], ["c", 2, "C updated"], ["d", 3, "D"]]
    );
});

test("a stale client ID cannot remove a different question", () => {
    const next = removeQuestionByClientId(initial, "missing");
    assert.deepEqual(next, initial);
});
