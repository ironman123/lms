// app/(main)/library/exam/page.tsx
import prisma from "@/lib/prisma";
import ExamCarouselCard from "@/components/ExamCarouselCard";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import { unstable_cache } from "next/cache";
import { deleteExam } from "@/app/(main)/actions/exam-actions";
import { getIsAdmin } from "@/lib/auth";

const getExamsData = (query: string, page: number) =>
    unstable_cache(
        async () => {
            const BATCH_SIZE = 30;
            const where = query ? {
                OR: [
                    { name: { contains: query, mode: "insensitive" as const } },
                    { description: { contains: query, mode: "insensitive" as const } },
                    { categoryNumber: { contains: query, mode: "insensitive" as const } },
                    { tags: { some: { tag: { name: { contains: query, mode: "insensitive" as const } } } } },
                    { syllabusEntries: { some: { topicPath: { contains: query, mode: "insensitive" as const } } } },
                    { syllabusEntries: { some: { category: { name: { contains: query, mode: "insensitive" as const } } } } },
                ],
            } : {};

            const [exams, total] = await Promise.all([
                prisma.exam.findMany({
                    where,
                    include: {
                        examCategory: true,
                        tags: { include: { tag: true } },
                        syllabusEntries: {
                            include: { category: true },
                            orderBy: { topicPath: "asc" },
                        },
                        _count: { select: { examQuestionPaperLinks: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: BATCH_SIZE,
                    skip: page * BATCH_SIZE,
                }),
                prisma.exam.count({ where }),
            ]);

            return { exams, total, totalPages: Math.ceil(total / BATCH_SIZE) };
        },
        [`all-exams-${query}-${page}`],
        { revalidate: 3600, tags: ["exams"] }
    )();

export default async function ExamIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const { q = "", page = "0" } = await searchParams;
    const currentPage = parseInt(page) || 0;
    const [{ exams, total, totalPages }, isAdmin] = await Promise.all([getExamsData(q, currentPage), getIsAdmin()]);

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        All <span className="text-slate-400 font-light">Exams</span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        {total} exams across all categories.
                    </p>
                </div>

                {isAdmin && (
                    <Link
                        href="/library/exam/new"
                        className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                        title="Add New Exam"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>
                )}

                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={q} />
                    </div>
                </div>

                {/* {q && (
                    <p className="text-sm text-slate-500 mb-6">
                        {total} result{total !== 1 ? "s" : ""} for <span className="font-bold text-slate-900">"{q}"</span>
                    </p>
                )} */}

                {exams.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                            {exams.map(exam => {
                                const boundDelete = deleteExam.bind(null, exam.id);
                                return (
                                    <ExamCarouselCard
                                        key={exam.id}
                                        id={exam.id}
                                        name={exam.name}
                                        slug={exam.slug}
                                        description={exam.description || ""}
                                        tags={exam.tags.map(t => t.tag.name)}
                                        categoryName={exam.examCategory?.name}
                                        accentColor={exam.examCategory?.color}
                                        totalMarks={exam.totalMarks}
                                        duration={exam.duration}
                                        isAdmin={isAdmin}
                                        onDelete={boundDelete}
                                        syllabus={Object.values(
                                            exam.syllabusEntries.reduce((acc, entry) => {
                                                const categoryName = entry.category.name;
                                                const leafName = entry.topicPath.split(">").at(-1)!.trim();
                                                if (!acc[categoryName]) acc[categoryName] = { category: categoryName, topics: [] };
                                                acc[categoryName].topics.push(leafName);
                                                return acc;
                                            }, {} as Record<string, { category: string; topics: string[] }>)
                                        )}
                                    />
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-16">
                                {currentPage > 0 && (
                                    <Link
                                        href={`?q=${q}&page=${currentPage - 1}`}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-colors"
                                    >
                                        Previous
                                    </Link>
                                )}
                                <span className="text-sm text-slate-500 font-medium">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                {currentPage < totalPages - 1 && (
                                    <Link
                                        href={`?q=${q}&page=${currentPage + 1}`}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-colors"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center bg-white max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No exams found</h3>
                        {q && (
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                Nothing matching <span className="font-bold text-slate-900">"{q}"</span>
                            </p>
                        )}
                        <Link
                            href="/library/exam"
                            className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Clear search
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}