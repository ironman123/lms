import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const examIds = request.nextUrl.searchParams
        .getAll("examId")
        .filter((value) => /^[0-9a-f-]{36}$/i.test(value))
        .slice(0, 20);

    if (query.length < 2) return NextResponse.json({ results: [] });
    if (query.length > 100) {
        return NextResponse.json(
            { error: "Topic search is too long." },
            { status: 400 }
        );
    }

    const examFilter =
        examIds.length > 0
            ? Prisma.sql`AND entry."examId" IN (${Prisma.join(examIds)})`
            : Prisma.empty;
    const normalized = query.toLocaleLowerCase("en");
    const pattern = `%${query}%`;
    const prefix = `${query}%`;
    const results = await prisma.$queryRaw<
        Array<{
            id: string;
            topicPath: string;
            categoryId: string;
            categoryName: string;
            topicId: string | null;
        }>
    >(Prisma.sql`
        WITH candidates AS (
            SELECT
                entry."id",
                entry."topicPath",
                entry."categoryId",
                category."name" AS "categoryName",
                entry."topicId",
                ROW_NUMBER() OVER (
                    PARTITION BY LOWER(entry."topicPath")
                    ORDER BY (entry."topicId" IS NOT NULL) DESC, entry."createdAt" ASC
                ) AS duplicate_rank
            FROM "ExamSyllabusEntry" entry
            JOIN "Category" category ON category."id" = entry."categoryId"
            WHERE entry."topicPath" ILIKE ${pattern}
            ${examFilter}
        )
        SELECT "id", "topicPath", "categoryId", "categoryName", "topicId"
        FROM candidates
        WHERE duplicate_rank = 1
        ORDER BY
            CASE
                WHEN LOWER("topicPath") = ${normalized} THEN 0
                WHEN REGEXP_REPLACE(LOWER("topicPath"), '^.*>\\s*', '') = ${normalized} THEN 1
                WHEN REGEXP_REPLACE("topicPath", '^.*>\\s*', '', 'i') ILIKE ${prefix} THEN 2
                WHEN "topicPath" ILIKE ${prefix} THEN 3
                ELSE 4
            END,
            similarity("topicPath", ${query}) DESC,
            LENGTH("topicPath") ASC
        LIMIT 30
    `);

    return NextResponse.json({
        results: results.map((entry) => ({
            id: entry.id,
            topicPath: entry.topicPath,
            categoryId: entry.categoryId,
            category: { name: entry.categoryName },
            topicId: entry.topicId,
        })),
    });
}
