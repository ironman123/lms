// app/(main)/library/paper/page.tsx
import prisma from "@/lib/prisma";
import WorkspacePaperCard from "@/components/WorkspacePaperCard";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import { unstable_cache } from "next/cache";
import { deleteQuestionPaper } from "../../actions/paper-actions";

const getPapersData = (query: string, page: number) =>
    unstable_cache(
        async () => {
            const BATCH_SIZE = 30;
            const where = query ? {
                OR: [
                    { title: { contains: query, mode: "insensitive" as const } },
                    { examQuestionPaperLinks: { some: { exam: { name: { contains: query, mode: "insensitive" as const } } } } },
                ],
            } : {};

            const [papers, total] = await Promise.all([
                prisma.questionPaper.findMany({
                    where,
                    include: {
                        examQuestionPaperLinks: {
                            include: {
                                exam: {
                                    select: { id: true, name: true, slug: true, duration: true, color: true }
                                }
                            },
                            take: 1,
                        },
                        _count: { select: { questions: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: BATCH_SIZE,
                    skip: page * BATCH_SIZE,
                }),
                prisma.questionPaper.count({ where }),
            ]);

            return { papers, total, totalPages: Math.ceil(total / BATCH_SIZE) };
        },
        [`papers-list-${query}-${page}`],
        { revalidate: 3600, tags: ["exams"] }
    )();

export default async function PaperLibraryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const { q = "", page = "0" } = await searchParams;
    const currentPage = parseInt(page) || 0;
    const { papers, total, totalPages } = await getPapersData(q, currentPage);
    const isAdmin = true;

    const pyq = papers.filter(p => p.year !== null);
    const mock = papers.filter(p => p.year === null);

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Question <span className="text-slate-400 font-light">Papers</span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        {total} papers total
                    </p>
                </div>

                {isAdmin && (
                    <Link
                        href="/library/paper/new"
                        className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                        title="Add Paper"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>
                )}

                <div className="flex justify-center mb-12 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={q} />
                    </div>
                </div>

                {pyq.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">
                            Previous Year Papers · {pyq.length}
                        </h2>
                        <div className="flex flex-wrap gap-6">
                            {pyq.map(p => {
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
                                        subject={exam?.name ?? "General"}
                                        duration={exam?.duration ?? 60}
                                        shift="General"
                                        color={exam?.color ?? "#0F172A"}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {mock.length > 0 && (
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">
                            Mock / Practice Papers · {mock.length}
                        </h2>
                        <div className="flex flex-wrap gap-6">
                            {mock.map(p => {
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
                                        //year="Mock"
                                        pricing="Free"
                                        examId={exam?.id ?? ""}
                                        examSlug={exam?.slug ?? ""}
                                        subject={exam?.name ?? "General"}
                                        duration={exam?.duration ?? 60}
                                        shift="General"
                                        color={exam?.color ?? "#0F172A"}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {papers.length === 0 && (
                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white max-w-2xl mx-auto">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900">No papers found</h3>
                        {q && (
                            <Link href="/library/paper" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-900">
                                Clear search
                            </Link>
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-16">
                        {currentPage > 0 && (
                            <Link href={`?q=${q}&page=${currentPage - 1}`} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-colors">
                                Previous
                            </Link>
                        )}
                        <span className="text-sm text-slate-500 font-medium">{currentPage + 1} / {totalPages}</span>
                        {currentPage < totalPages - 1 && (
                            <Link href={`?q=${q}&page=${currentPage + 1}`} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-colors">
                                Next
                            </Link>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}