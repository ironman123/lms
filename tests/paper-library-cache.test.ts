import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
    return readFileSync(resolve(root, path), "utf8");
}

function exportedFunctionBody(file: string, name: string) {
    const start = file.indexOf(`export async function ${name}`);
    assert.notEqual(start, -1, `${name} should exist`);
    const next = file.indexOf("export async function ", start + 1);
    return file.slice(start, next === -1 ? undefined : next);
}

test("paper list mutations invalidate the shared papers cache", () => {
    const actions = source("app/(main)/actions/paper-actions.ts");
    for (const action of [
        "linkPaperToExam",
        "unlinkPaperFromExam",
        "createQuestionPaper",
        "updateQuestionPaper",
        "deleteQuestionPaper",
    ]) {
        assert.match(
            exportedFunctionBody(actions, action),
            /invalidateTag\("papers"\)/,
            `${action} must invalidate cached paper lists`
        );
    }
});

test("paper list cache separates admin drafts from the public audience", () => {
    const page = source("app/(main)/library/paper/page.tsx");
    assert.match(page, /audience:\$\{includeDrafts \? "admin" : "public"\}/);
    assert.match(page, /includeDrafts \? \{\} : \{ status: "PUBLISHED" as const \}/);
    assert.match(page, /getPapersData\([\s\S]*isAdmin[\s\S]*\)/);
});

test("paper administration controls do not depend on hover", () => {
    const card = source("components/WorkspacePaperCard.tsx");
    assert.doesNotMatch(card, /group-hover:opacity-100/);
    assert.match(card, /aria-label=\{`Edit \$\{title\}`\}/);
    assert.match(card, /aria-label=\{`Archive \$\{title\}`\}/);
    assert.match(card, /AlertDialogContent/);
    assert.match(card, /min-h-11/);
});
