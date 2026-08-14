import "server-only";

import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    formatPaperImportIssues,
    paperImportCommandSchema,
    type PaperImportCommand,
    type ValidatedPaperImportCommand,
} from "@/lib/paper-authoring";
import {
    buildQuestionData,
    type ResolvedQuestionTopic,
} from "@/lib/question-persistence";

export class PaperImportError extends Error {
    constructor(
        message: string,
        readonly issues: Array<{ path: string; message: string }> = []
    ) {
        super(message);
        this.name = "PaperImportError";
    }
}

type ResolvedImportItem = ValidatedPaperImportCommand["items"][number] & {
    resolvedTopic: ResolvedQuestionTopic;
};

async function resolveTopics(
    tx: Prisma.TransactionClient,
    paperId: string,
    items: ValidatedPaperImportCommand["items"]
): Promise<ResolvedImportItem[]> {
    const links = await tx.examQuestionPaperLink.findMany({
        where: { paperId },
        select: { examId: true },
    });
    const linkedExamIds = new Set(links.map((link) => link.examId));
    const explicitIds = [
        ...new Set(
            items
                .map((item) => item.data.syllabusEntryId)
                .filter((value): value is string => Boolean(value))
        ),
    ];
    const customPaths = [
        ...new Set(
            items
                .filter((item) => !item.data.syllabusEntryId)
                .map((item) => item.data.topicPath?.trim())
                .filter((value): value is string => Boolean(value))
        ),
    ];

    const [explicitEntries, exactPathEntries] = await Promise.all([
        explicitIds.length > 0
            ? tx.examSyllabusEntry.findMany({
                  where: { id: { in: explicitIds } },
                  select: {
                      id: true,
                      examId: true,
                      topicId: true,
                      topicPath: true,
                  },
              })
            : [],
        customPaths.length > 0
            ? tx.examSyllabusEntry.findMany({
                  where: {
                      ...(linkedExamIds.size > 0
                          ? { examId: { in: [...linkedExamIds] } }
                          : {}),
                      topicPath: {
                          in: customPaths,
                          mode: "insensitive",
                      },
                  },
                  select: {
                      id: true,
                      examId: true,
                      topicId: true,
                      topicPath: true,
                  },
                  orderBy: [{ topicId: "desc" }, { createdAt: "asc" }],
              })
            : [],
    ]);

    const explicitById = new Map(
        explicitEntries.map((entry) => [entry.id, entry])
    );
    const exactByPath = new Map<string, (typeof exactPathEntries)[number]>();
    for (const entry of exactPathEntries) {
        const key = entry.topicPath.trim().toLocaleLowerCase("en");
        if (!exactByPath.has(key)) exactByPath.set(key, entry);
    }

    return items.map((item, index) => {
        const syllabusEntryId = item.data.syllabusEntryId;
        if (syllabusEntryId) {
            const entry = explicitById.get(syllabusEntryId);
            if (!entry) {
                throw new PaperImportError("A selected topic no longer exists.", [
                    {
                        path: `items.${index}.data.syllabusEntryId`,
                        message: "Select the topic again.",
                    },
                ]);
            }
            if (linkedExamIds.size > 0 && !linkedExamIds.has(entry.examId)) {
                throw new PaperImportError(
                    "A selected topic does not belong to this paper's exams.",
                    [
                        {
                            path: `items.${index}.data.syllabusEntryId`,
                            message: "Choose a topic from one of the linked exams.",
                        },
                    ]
                );
            }
            return {
                ...item,
                resolvedTopic: {
                    syllabusEntryId: entry.id,
                    topicId: entry.topicId,
                    topicPath: entry.topicPath,
                },
            };
        }

        const customPath = item.data.topicPath?.trim() || null;
        const exactEntry = customPath
            ? exactByPath.get(customPath.toLocaleLowerCase("en"))
            : undefined;
        return {
            ...item,
            resolvedTopic: exactEntry
                ? {
                      syllabusEntryId: exactEntry.id,
                      topicId: exactEntry.topicId,
                      topicPath: exactEntry.topicPath,
                  }
                : {
                      syllabusEntryId: null,
                      topicId: null,
                      topicPath: customPath,
                  },
        };
    });
}

function validateCommand(raw: PaperImportCommand) {
    const parsed = paperImportCommandSchema.safeParse(raw);
    if (!parsed.success) {
        throw new PaperImportError(
            "Fix the invalid imported questions before saving.",
            formatPaperImportIssues(parsed.error)
        );
    }
    return parsed.data;
}

export async function commitPaperImport(
    adminId: string,
    rawCommand: PaperImportCommand
) {
    const command = validateCommand(rawCommand);

    return prisma.$transaction(
        async (tx) => {
            const existingImport = await tx.paperImport.findUnique({
                where: {
                    paperId_idempotencyKey: {
                        paperId: command.paperId,
                        idempotencyKey: command.idempotencyKey,
                    },
                },
                include: {
                    questions: {
                        orderBy: { position: "asc" },
                        select: { id: true, position: true, sourceNumber: true },
                    },
                },
            });

            if (existingImport) {
                if (existingImport.questionCount !== command.items.length) {
                    throw new PaperImportError(
                        "This import key was already used for a different file."
                    );
                }
                if (
                    existingImport.sourceHash &&
                    command.sourceHash &&
                    existingImport.sourceHash !== command.sourceHash
                ) {
                    throw new PaperImportError(
                        "This import key was already used for different content."
                    );
                }
                const sortedItems = [...command.items].sort(
                    (left, right) => left.position - right.position
                );
                return {
                    importId: existingImport.id,
                    paperRevision: null,
                    deduplicated: true,
                    questions: existingImport.questions.map((question, index) => ({
                        clientId: sortedItems[index]?.clientId ?? question.id,
                        id: question.id,
                        position: question.position,
                    })),
                };
            }

            await tx.$queryRaw(
                Prisma.sql`SELECT "id" FROM "QuestionPaper" WHERE "id" = ${command.paperId} FOR UPDATE`
            );
            const paper = await tx.questionPaper.findUnique({
                where: { id: command.paperId },
                select: { id: true, contentRevision: true },
            });
            if (!paper) throw new PaperImportError("Question paper not found.");
            if (
                command.expectedRevision !== undefined &&
                paper.contentRevision !== command.expectedRevision
            ) {
                throw new PaperImportError(
                    "This paper changed in another tab. Reload it before saving the import."
                );
            }

            const resolvedItems = await resolveTopics(
                tx,
                command.paperId,
                command.items
            );
            const highestPosition = await tx.question.aggregate({
                where: {
                    paperId: command.paperId,
                    isArchived: false,
                },
                _max: { position: true },
            });
            const archivedAt = new Date();
            if (command.mode === "REPLACE") {
                await tx.question.updateMany({
                    where: { paperId: command.paperId, isArchived: false },
                    data: {
                        isArchived: true,
                        archivedAt,
                        archiveReason: "IMPORT_REPLACED",
                        contentRevision: { increment: 1 },
                    },
                });
            }
            const positionOffset = command.mode === "REPLACE"
                ? 0
                : (highestPosition._max.position ?? -1) + 1;
            const importId = crypto.randomUUID();
            const committedAt = new Date();
            const sortedItems = [...resolvedItems].sort(
                (left, right) => left.position - right.position
            );
            const questionRows = sortedItems.map((item, index) => ({
                id: crypto.randomUUID(),
                paperId: command.paperId,
                importId,
                position: positionOffset + index,
                sourceNumber: item.sourceNumber ?? null,
                ...buildQuestionData(item.data, item.resolvedTopic),
            }));

            await tx.paperImport.create({
                data: {
                    id: importId,
                    paperId: command.paperId,
                    createdById: adminId,
                    source: command.source,
                    idempotencyKey: command.idempotencyKey,
                    sourceFileName: command.sourceFileName ?? null,
                    sourceHash: command.sourceHash ?? null,
                    questionCount: questionRows.length,
                    committedAt,
                    metadata: {
                        mode: command.mode,
                        autoMatchedTopicCount: questionRows.filter(
                            (question) => question.syllabusEntryId !== null
                        ).length,
                    },
                },
            });
            await tx.question.createMany({ data: questionRows });
            const updatedPaper = await tx.questionPaper.update({
                where: { id: command.paperId },
                data: {
                    contentRevision: { increment: 1 },
                    status: "DRAFT",
                },
                select: { contentRevision: true },
            });

            return {
                importId,
                paperRevision: updatedPaper.contentRevision,
                deduplicated: false,
                questions: questionRows.map((question, index) => ({
                    clientId: sortedItems[index].clientId,
                    id: question.id,
                    position: question.position,
                })),
            };
        },
        {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 30_000,
        }
    );
}
