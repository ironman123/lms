// app/(main)/library/paper/page.tsx
import prisma from "@/lib/prisma";
import WorkspacePaperCard from "@/components/WorkspacePaperCard";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import PaginationPrefetch from "@/components/PaginationPrefetch";
import { deleteQuestionPaper } from "../../actions/paper-actions";
import { getOptionalUser } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { SessionMode, SessionStatus } from "@prisma/client";
import { RESUMABLE_SESSION_STATUSES } from "@/lib/session-policy";
import { redirect } from "next/navigation";

const PAGE_SIZE = 12;

function normalizeQuery(query: string) {
    return query.trim().replace(/\s+/g, " ");
}

function paperPageHref(query: string, page: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    return `?${params.toString()}`;
}

async function getPapersData(query: string, page: number) {
    const normalizedQuery = normalizeQuery(query);
    const cacheKey =
        `papers:v2:q:${normalizedQuery.toLowerCase()}:p:${page}`;
    return withCache(
        cacheKey,
        3600,
        async () => {
            const where = normalizedQuery
                ? {
                    OR: [
                        { title: { contains: normalizedQuery, mode: "insensitive" as const } },
                        {
                            examQuestionPaperLinks: {
                                some: { exam: { name: { contains: normalizedQuery, mode: "insensitive" as const } } },
                            },
                        },
                    ],
                }
                : {};

            const [papers, total] = await Promise.all([
                prisma.questionPaper.findMany({
                    where,
                    include: {
                        examQuestionPaperLinks: {
                            include: {
                                exam: {
                                    select: { id: true, name: true, slug: true, duration: true, color: true },
                                },
                            },
                            take: 1,
                        },
                        _count: {
                            select: {
                                questions: {
                                    where: { isArchived: false },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: PAGE_SIZE,
                    skip: page * PAGE_SIZE,
                }),
                prisma.questionPaper.count({ where }),
            ]);

            return { papers, total, totalPages: Math.ceil(total / PAGE_SIZE) };
        },
        ["papers"]
    );
}

export default async function PaperLibraryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const { q = "", page = "0" } = await searchParams;
    const query = normalizeQuery(q);
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const [{ papers, total, totalPages }, user] = await Promise.all([
        getPapersData(query, currentPage),
        getOptionalUser(),
    ]);
    if (currentPage > 0 && currentPage >= Math.max(totalPages, 1)) {
        redirect(paperPageHref(query, Math.max(0, totalPages - 1)));
    }
    const isAdmin = user?.role === "ADMIN";
    const resumableByPaper = new Map<
        string,
        { id: string; mode: "PRACTICE" | "MOCK" }
    >();

    if (user && papers.length > 0) {
        const now = new Date();
        const paperIds = papers.map((paper) => paper.id);

        await prisma.testSession.updateMany({
            where: {
                userId: user.id,
                paperId: { in: paperIds },
                status: { in: [...RESUMABLE_SESSION_STATUSES] },
                expiresAt: { lte: now },
            },
            data: { status: SessionStatus.EXPIRED },
        });

        const resumableSessions = await prisma.testSession.findMany({
            where: {
                userId: user.id,
                paperId: { in: paperIds },
                status: { in: [...RESUMABLE_SESSION_STATUSES] },
                expiresAt: { gt: now },
            },
            select: { id: true, paperId: true, mode: true },
            orderBy: { updatedAt: "desc" },
        });

        for (const session of resumableSessions) {
            if (
                session.mode !== SessionMode.PRACTICE &&
                session.mode !== SessionMode.MOCK
            ) {
                continue;
            }
            if (!resumableByPaper.has(session.paperId)) {
                resumableByPaper.set(session.paperId, {
                    id: session.id,
                    mode: session.mode,
                });
            }
        }
    }

    const pyq = papers.filter((p) => p.year !== null);
    const mock = papers.filter((p) => p.year === null);

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
                        Question <span className="text-muted-foreground font-light">Papers</span>
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {total} papers total
                    </p>
                </div>

                {isAdmin && (
                    <Link
                        href="/library/paper/new"
                        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 md:bottom-8 md:right-8 md:z-50"
                        title="Add Paper"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>
                )}

                <div className="flex justify-center mb-12 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={query} />
                    </div>
                </div>

                {pyq.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
                            Previous Year Papers · {pyq.length}
                        </h2>
                        <div className="flex flex-wrap gap-6">
                            {pyq.map((p) => {
                                const exam = p.examQuestionPaperLinks[0]?.exam;
                                const boundDelete = deleteQuestionPaper.bind(null, p.id, "");
                                return (
                                    <WorkspacePaperCard
                                        key={p.id}
                                        id={p.id}
                                        title={p.title}
                                        onDelete={boundDelete}
                                        isAdmin={isAdmin}
                                        type="PYQ"
                                        year={p.year?.toString() ?? ""}
                                        pricing="Free"
                                        examId={exam?.id ?? ""}
                                        examSlug={exam?.slug ?? ""}
                                        subject={exam?.name ?? "Standalone topic paper"}
                                        duration={exam?.duration ?? 60}
                                        shift="General"
                                        color={exam?.color ?? "#0F172A"}
                                        resumableSession={resumableByPaper.get(
                                            p.id
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {mock.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
                            Mock / Practice Papers · {mock.length}
                        </h2>
                        <div className="flex flex-wrap gap-6">
                            {mock.map((p) => {
                                const exam = p.examQuestionPaperLinks[0]?.exam;
                                const boundDelete = deleteQuestionPaper.bind(null, p.id, "");
                                return (
                                    <WorkspacePaperCard
                                        key={p.id}
                                        id={p.id}
                                        title={p.title}
                                        isAdmin={isAdmin}
                                        onDelete={boundDelete}
                                        type="Mock"
                                        pricing="Free"
                                        examId={exam?.id ?? ""}
                                        examSlug={exam?.slug ?? ""}
                                        subject={exam?.name ?? "Standalone topic paper"}
                                        duration={exam?.duration ?? 60}
                                        shift="General"
                                        color={exam?.color ?? "#0F172A"}
                                        resumableSession={resumableByPaper.get(
                                            p.id
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {papers.length === 0 && (
                    <div className="p-12 border-2 border-dashed border-border rounded-3xl text-center bg-card max-w-2xl mx-auto">
                        <Search className="w-10 h-10 text-muted-foreground/60 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-foreground">No papers found</h3>
                        {query && (
                            <Link
                                href="/library/paper"
                                className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
                            >
                                Clear search
                            </Link>
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <>
                    <PaginationPrefetch
                        nextHref={
                            currentPage < totalPages - 1
                                ? paperPageHref(query, currentPage + 1)
                                : undefined
                        }
                    />
                    <div className="flex items-center justify-center gap-3 mt-16">
                        {currentPage > 0 && (
                            <Link
                                href={paperPageHref(query, currentPage - 1)}
                                prefetch={true}
                                className="px-5 py-2.5 text-sm font-bold text-muted-foreground bg-card border border-border rounded-xl hover:border-slate-400 transition-colors"
                            >
                                Previous
                            </Link>
                        )}
                        <span className="text-sm text-muted-foreground font-medium">
                            {currentPage + 1} / {totalPages}
                        </span>
                        {currentPage < totalPages - 1 && (
                            <Link
                                href={paperPageHref(query, currentPage + 1)}
                                prefetch={true}
                                className="px-5 py-2.5 text-sm font-bold text-muted-foreground bg-card border border-border rounded-xl hover:border-slate-400 transition-colors"
                            >
                                Next
                            </Link>
                        )}
                    </div>
                    </>
                )}
            </main>
        </div>
    );
}
