import "dotenv/config";
import prisma from "../lib/prisma";
import {
    applyMistakeGrade,
    type MistakeProjectionState,
} from "../lib/mistake-notebook-policy";

const [interactions, entries] = await Promise.all([
    prisma.questionInteraction.findMany({
        where: {
            grade: { in: ["CORRECT", "INCORRECT"] },
            session: { status: "COMPLETED" },
        },
        select: {
            userId: true,
            questionId: true,
            grade: true,
            session: {
                select: {
                    completedAt: true,
                    endTime: true,
                    startTime: true,
                },
            },
        },
    }),
    prisma.mistakeNotebookEntry.findMany({
        select: {
            userId: true,
            questionId: true,
            status: true,
            wrongCount: true,
            correctAfterMistakeCount: true,
        },
    }),
]);

interactions.sort((left, right) => {
    const leftAt =
        left.session.completedAt ??
        left.session.endTime ??
        left.session.startTime;
    const rightAt =
        right.session.completedAt ??
        right.session.endTime ??
        right.session.startTime;
    return leftAt.getTime() - rightAt.getTime();
});

const expected = new Map<string, MistakeProjectionState>();
for (const interaction of interactions) {
    const key = `${interaction.userId}:${interaction.questionId}`;
    const next = applyMistakeGrade(
        expected.get(key) ?? null,
        interaction.grade as "CORRECT" | "INCORRECT"
    );
    if (next) expected.set(key, next);
}

let mismatches = 0;
for (const entry of entries) {
    const key = `${entry.userId}:${entry.questionId}`;
    const projected = expected.get(key);
    if (
        !projected ||
        projected.status !== entry.status ||
        projected.wrongCount !== entry.wrongCount ||
        projected.correctAfterMistakeCount !==
            entry.correctAfterMistakeCount
    ) {
        mismatches++;
    }
    expected.delete(key);
}
mismatches += expected.size;

const counts = entries.reduce(
    (result, entry) => {
        result[entry.status]++;
        return result;
    },
    { ACTIVE: 0, REPAIRED: 0 }
);

console.log(
    JSON.stringify(
        {
            completedObjectiveInteractions: interactions.length,
            entries: entries.length,
            ...counts,
            mismatches,
        },
        null,
        2
    )
);

await prisma.$disconnect();
if (mismatches !== 0) process.exitCode = 1;
