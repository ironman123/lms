import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import ExamCarouselCard from "@/components/ExamCarouselCard";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import PaginationPrefetch from "@/components/PaginationPrefetch";
import { deleteExam } from "@/app/(main)/actions/exam-actions";
import { getIsAdmin } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { redirect } from "next/navigation";

const PAGE_SIZE = 12;
const SYLLABUS_PREVIEW_LIMIT = 10;
const SEARCH_CACHE_VERSION = "v3";

const examCardInclude = {
    examCategory: { select: { name: true, color: true } },
    tags: { select: { tag: { select: { name: true } } } },
    syllabusEntries: {
        select: {
            topicPath: true,
            category: { select: { name: true } },
        },
        orderBy: { topicPath: "asc" as const },
        take: SYLLABUS_PREVIEW_LIMIT,
    },
    _count: {
        select: {
            examQuestionPaperLinks: true,
            syllabusEntries: true,
        },
    },
} satisfies Prisma.ExamInclude;

type ExamCardRecord = Prisma.ExamGetPayload<{ include: typeof examCardInclude }>;
type RankedExamId = { id: string };
type CountRow = { count: bigint | number };

function escapeLike(value: string) {
    return value.replace(/[\\%_]/g, "\\$&");
}

function normalizeQuery(query: string) {
    return query.trim().replace(/\s+/g, " ");
}

function examPageHref(query: string, page: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    return `?${params.toString()}`;
}

function fuzzyTitleClause(query: string) {
    return query.length >= 3
        ? Prisma.sql`OR similarity("exam"."name", ${query}) >= 0.3`
        : Prisma.empty;
}

async function getExamCardsByIds(ids: string[]): Promise<ExamCardRecord[]> {
    if (ids.length === 0) return [];

    const exams = await prisma.exam.findMany({
        where: { id: { in: ids } },
        include: examCardInclude,
    });
    const order = new Map(ids.map((id, index) => [id, index]));

    return exams.sort(
        (left, right) =>
            (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
}

async function getBrowsePage(page: number) {
    return withCache(
        `exams:${SEARCH_CACHE_VERSION}:browse:p:${page}`,
        3600,
        async () => {
            const [exams, total] = await Promise.all([
                prisma.exam.findMany({
                    include: examCardInclude,
                    orderBy: { createdAt: "desc" },
                    take: PAGE_SIZE,
                    skip: page * PAGE_SIZE,
                }),
                prisma.exam.count(),
            ]);

            return {
                exams,
                total,
                totalPages: Math.ceil(total / PAGE_SIZE),
            };
        },
        ["exams"],
        { deferWrite: true }
    );
}

async function getTitleMatches(query: string, page: number) {
    const normalizedQuery = normalizeQuery(query);
    const escapedQuery = escapeLike(normalizedQuery);
    const containsPattern = `%${escapedQuery}%`;
    const prefixPattern = `${escapedQuery}%`;
    const pageOffset = page * PAGE_SIZE;

    return withCache(
        `exams:${SEARCH_CACHE_VERSION}:title:q:${normalizedQuery.toLowerCase()}:p:${page}`,
        900,
        async () => {
            const fuzzyClause = fuzzyTitleClause(normalizedQuery);
            const [countRows, rankedIds] = await Promise.all([
                prisma.$queryRaw<CountRow[]>(Prisma.sql`
                    SELECT COUNT(*)::bigint AS "count"
                    FROM "Exam" AS "exam"
                    WHERE "exam"."name" ILIKE ${containsPattern} ESCAPE '\'
                       ${fuzzyClause}
                `),
                prisma.$queryRaw<RankedExamId[]>(Prisma.sql`
                    SELECT "exam"."id"
                    FROM "Exam" AS "exam"
                    WHERE "exam"."name" ILIKE ${containsPattern} ESCAPE '\'
                       ${fuzzyClause}
                    ORDER BY
                        CASE
                            WHEN LOWER("exam"."name") = LOWER(${normalizedQuery}) THEN 0
                            WHEN "exam"."name" ILIKE ${prefixPattern} ESCAPE '\' THEN 1
                            WHEN "exam"."name" ILIKE ${containsPattern} ESCAPE '\' THEN 2
                            ELSE 3
                        END,
                        similarity("exam"."name", ${normalizedQuery}) DESC,
                        "exam"."createdAt" DESC,
                        "exam"."id" ASC
                    OFFSET ${pageOffset}
                    LIMIT ${PAGE_SIZE}
                `),
            ]);

            const titleTotal = Number(countRows[0]?.count ?? 0);
            const titleIds = rankedIds.map(({ id }) => id);
            const exams = await getExamCardsByIds(titleIds);
            const titleTake = exams.length;

            return {
                exams,
                titleTotal,
                deepOffset: Math.max(0, pageOffset - titleTotal),
                deepTake: PAGE_SIZE - titleTake,
            };
        },
        ["exams"],
        { deferWrite: true }
    );
}

async function getDeepMatches(
    query: string,
    offset: number,
    take: number
) {
    const normalizedQuery = normalizeQuery(query);
    const escapedQuery = escapeLike(normalizedQuery);
    const containsPattern = `%${escapedQuery}%`;

    return withCache(
        `exams:${SEARCH_CACHE_VERSION}:deep:q:${normalizedQuery.toLowerCase()}:o:${offset}:t:${take}`,
        900,
        async () => {
            const fuzzyClause = fuzzyTitleClause(normalizedQuery);
            const deepMatch = Prisma.sql`
                (
                    "exam"."description" ILIKE ${containsPattern} ESCAPE '\'
                    OR "category"."name" ILIKE ${containsPattern} ESCAPE '\'
                    OR EXISTS (
                        SELECT 1
                        FROM "ExamsTagsLink" AS "tagLink"
                        JOIN "Tag" AS "tag" ON "tag"."id" = "tagLink"."tagId"
                        WHERE "tagLink"."examId" = "exam"."id"
                          AND "tag"."name" ILIKE ${containsPattern} ESCAPE '\'
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "ExamSyllabusEntry" AS "syllabus"
                        WHERE "syllabus"."examId" = "exam"."id"
                          AND "syllabus"."topicPath" ILIKE ${containsPattern} ESCAPE '\'
                    )
                )
            `;
            const notATitleMatch = Prisma.sql`
                NOT (
                    "exam"."name" ILIKE ${containsPattern} ESCAPE '\'
                    ${fuzzyClause}
                )
            `;

            const [countRows, rankedIds] = await Promise.all([
                prisma.$queryRaw<CountRow[]>(Prisma.sql`
                    SELECT COUNT(*)::bigint AS "count"
                    FROM "Exam" AS "exam"
                    LEFT JOIN "ExamCategory" AS "category"
                        ON "category"."id" = "exam"."examCategoryId"
                    WHERE ${notATitleMatch}
                      AND ${deepMatch}
                `),
                take > 0
                    ? prisma.$queryRaw<RankedExamId[]>(Prisma.sql`
                        SELECT "exam"."id"
                        FROM "Exam" AS "exam"
                        LEFT JOIN "ExamCategory" AS "category"
                            ON "category"."id" = "exam"."examCategoryId"
                        WHERE ${notATitleMatch}
                          AND ${deepMatch}
                        ORDER BY
                            CASE
                                WHEN "category"."name" ILIKE ${containsPattern} ESCAPE '\' THEN 0
                                WHEN EXISTS (
                                    SELECT 1
                                    FROM "ExamsTagsLink" AS "rankTagLink"
                                    JOIN "Tag" AS "rankTag"
                                      ON "rankTag"."id" = "rankTagLink"."tagId"
                                    WHERE "rankTagLink"."examId" = "exam"."id"
                                      AND "rankTag"."name" ILIKE ${containsPattern} ESCAPE '\'
                                ) THEN 1
                                WHEN "exam"."description" ILIKE ${containsPattern} ESCAPE '\' THEN 2
                                ELSE 3
                            END,
                            "exam"."createdAt" DESC,
                            "exam"."id" ASC
                        OFFSET ${offset}
                        LIMIT ${take}
                    `)
                    : Promise.resolve([] as RankedExamId[]),
            ]);

            const deepTotal = Number(countRows[0]?.count ?? 0);
            const exams = await getExamCardsByIds(rankedIds.map(({ id }) => id));

            return { exams, deepTotal };
        },
        ["exams"],
        { deferWrite: true }
    );
}

function groupSyllabusPreview(exam: ExamCardRecord) {
    return Object.values(
        exam.syllabusEntries.reduce(
            (acc, entry) => {
                const categoryName = entry.category.name;
                const leafName =
                    entry.topicPath.split(">").at(-1)?.trim() || entry.topicPath;

                if (!acc[categoryName]) {
                    acc[categoryName] = { category: categoryName, topics: [] };
                }
                acc[categoryName].topics.push(leafName);
                return acc;
            },
            {} as Record<string, { category: string; topics: string[] }>
        )
    );
}

function ExamCards({
    exams,
    isAdmin,
}: {
    exams: ExamCardRecord[];
    isAdmin: boolean;
}) {
    return exams.map((exam) => (
        <ExamCarouselCard
            key={exam.id}
            id={exam.id}
            name={exam.name}
            slug={exam.slug}
            description={exam.description || ""}
            tags={exam.tags.map((tagLink) => tagLink.tag.name)}
            categoryName={exam.examCategory?.name}
            accentColor={exam.examCategory?.color}
            totalMarks={exam.totalMarks}
            duration={exam.duration}
            isAdmin={isAdmin}
            onDelete={deleteExam.bind(null, exam.id)}
            syllabus={groupSyllabusPreview(exam)}
            syllabusTopicCount={exam._count.syllabusEntries}
        />
    ));
}

function Pagination({
    query,
    currentPage,
    totalPages,
}: {
    query: string;
    currentPage: number;
    totalPages: number;
}) {
    if (totalPages <= 1) return null;

    const previousHref =
        currentPage > 0
            ? examPageHref(query, currentPage - 1)
            : undefined;
    const nextHref =
        currentPage < totalPages - 1
            ? examPageHref(query, currentPage + 1)
            : undefined;

    return (
        <>
            <PaginationPrefetch nextHref={nextHref} />
            <div className="flex items-center justify-center gap-3 mt-16">
                {previousHref && (
                    <Link
                        href={previousHref}
                        prefetch={true}
                        className="px-5 py-2.5 text-sm font-bold text-muted-foreground bg-card border border-border rounded-xl hover:border-slate-400 transition-colors"
                    >
                        Previous
                    </Link>
                )}
                <span className="text-sm text-muted-foreground font-medium">
                    {currentPage + 1} / {totalPages}
                </span>
                {nextHref && (
                    <Link
                        href={nextHref}
                        prefetch={true}
                        className="px-5 py-2.5 text-sm font-bold text-muted-foreground bg-card border border-border rounded-xl hover:border-slate-400 transition-colors"
                    >
                        Next
                    </Link>
                )}
            </div>
        </>
    );
}

function DeepSearchFallback({ slots }: { slots: number }) {
    if (slots <= 0) {
        return (
            <p className="mt-10 text-center text-sm text-muted-foreground">
                Checking descriptions and syllabus…
            </p>
        );
    }

    return (
        <section className="mt-12" aria-label="Searching descriptions and syllabus">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                Searching descriptions and syllabus…
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
                {Array.from({ length: Math.min(slots, 3) }, (_, index) => (
                    <div
                        key={index}
                        className="h-[430px] rounded-[2rem] border border-border bg-card animate-pulse"
                    />
                ))}
            </div>
        </section>
    );
}

async function DeepSearchResults({
    query,
    offset,
    take,
    titleTotal,
    currentPage,
    isAdmin,
}: {
    query: string;
    offset: number;
    take: number;
    titleTotal: number;
    currentPage: number;
    isAdmin: boolean;
}) {
    const { exams, deepTotal } = await getDeepMatches(query, offset, take);
    const total = titleTotal + deepTotal;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (currentPage > 0 && currentPage >= Math.max(totalPages, 1)) {
        redirect(examPageHref(query, Math.max(0, totalPages - 1)));
    }

    if (total === 0) {
        return <EmptyState query={query} />;
    }

    return (
        <>
            {exams.length > 0 && (
                <section className="mt-12">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        More matches from details and syllabus
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                        <ExamCards exams={exams} isAdmin={isAdmin} />
                    </div>
                </section>
            )}

            <p className="mt-10 text-center text-sm text-muted-foreground">
                {total} {total === 1 ? "result" : "results"} found
            </p>
            <Pagination
                query={query}
                currentPage={currentPage}
                totalPages={totalPages}
            />
        </>
    );
}

function EmptyState({ query }: { query: string }) {
    return (
        <div className="p-12 border-2 border-dashed border-border rounded-[2rem] text-center bg-card max-w-2xl mx-auto w-full">
            <Search className="w-10 h-10 text-muted-foreground/60 mb-4 mx-auto" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">
                No exams found
            </h3>
            {query && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Nothing matching{" "}
                    <span className="font-bold text-foreground">“{query}”</span>
                </p>
            )}
            <Link
                href="/library/exam"
                className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-muted text-foreground/80 text-sm font-bold rounded-xl hover:bg-muted transition-colors"
            >
                Clear search
            </Link>
        </div>
    );
}

export default async function ExamIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const { q = "", page = "0" } = await searchParams;
    const query = normalizeQuery(q);
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const isAdminPromise = getIsAdmin();

    if (!query) {
        const [{ exams, total, totalPages }, isAdmin] = await Promise.all([
            getBrowsePage(currentPage),
            isAdminPromise,
        ]);
        if (currentPage > 0 && currentPage >= Math.max(totalPages, 1)) {
            redirect(examPageHref("", Math.max(0, totalPages - 1)));
        }

        return (
            <PageShell total={total} query={query} isAdmin={isAdmin}>
                {exams.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                            <ExamCards exams={exams} isAdmin={isAdmin} />
                        </div>
                        <Pagination
                            query=""
                            currentPage={currentPage}
                            totalPages={totalPages}
                        />
                    </>
                ) : (
                    <EmptyState query="" />
                )}
            </PageShell>
        );
    }

    const [{ exams, titleTotal, deepOffset, deepTake }, isAdmin] =
        await Promise.all([getTitleMatches(query, currentPage), isAdminPromise]);

    return (
        <PageShell query={query} isAdmin={isAdmin}>
            {exams.length > 0 && (
                <section>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        Best title matches
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                        <ExamCards exams={exams} isAdmin={isAdmin} />
                    </div>
                </section>
            )}

            <Suspense fallback={<DeepSearchFallback slots={deepTake} />}>
                <DeepSearchResults
                    query={query}
                    offset={deepOffset}
                    take={deepTake}
                    titleTotal={titleTotal}
                    currentPage={currentPage}
                    isAdmin={isAdmin}
                />
            </Suspense>
        </PageShell>
    );
}

function PageShell({
    total,
    query,
    isAdmin,
    children,
}: {
    total?: number;
    query: string;
    isAdmin: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
                        All{" "}
                        <span className="text-muted-foreground font-light">
                            Exams
                        </span>
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {query
                            ? `Showing matches for “${query}”`
                            : `${total ?? 0} exams across all categories.`}
                    </p>
                </div>

                {isAdmin && (
                    <Link
                        href="/library/exam/new"
                        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 md:bottom-8 md:right-8 md:z-50"
                        title="Add New Exam"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>
                )}

                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={query} />
                    </div>
                </div>

                {children}
            </main>
        </div>
    );
}
