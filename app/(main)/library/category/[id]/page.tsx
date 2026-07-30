// app/library/category/[id]/page.tsx

// import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import ExamCarouselCard from "@/components/ExamCarouselCard";
import Link from "next/link";
import { ChevronLeft, Search, Plus } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import PaginationPrefetch from "@/components/PaginationPrefetch";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { deleteExam } from "@/app/(main)/actions/exam-actions";
import { getIsAdmin } from "@/lib/auth";

const PAGE_SIZE = 12;

function normalizeQuery(query: string) {
    return query.trim().replace(/\s+/g, " ");
}

function categoryPageHref(slug: string, query: string, page: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    return `/library/category/${slug}?${params.toString()}`;
}

const getExamsData = (slug: string, query: string, page: number) =>
    unstable_cache(
        async () => {
            const where = {
                examCategory: { slug },
                ...(query ? {
                    OR: [
                        { name: { contains: query, mode: "insensitive" as const } },
                        { description: { contains: query, mode: "insensitive" as const } },
                        { categoryNumber: { contains: query, mode: "insensitive" as const } },
                        { tags: { some: { tag: { name: { contains: query, mode: "insensitive" as const } } } } },
                        { syllabusEntries: { some: { topicPath: { contains: query, mode: "insensitive" as const } } } },
                        { syllabusEntries: { some: { category: { name: { contains: query, mode: "insensitive" as const } } } } },
                    ]
                } : {})
            };
            const [exams, total] = await Promise.all([
                prisma.exam.findMany({
                where: {
                    ...where,
                },
                include: {
                    tags: {
                        include: {
                            tag: true
                        }
                    },
                    examCategory: true,

                    // -----------------------------------------
                    // THE FIX: Fetch syllabus via the new bridge
                    // -----------------------------------------
                    syllabusEntries: {
                        include: { category: true },
                        orderBy: { topicPath: 'asc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: PAGE_SIZE,
                skip: page * PAGE_SIZE,
                }),
                prisma.exam.count({ where }),
            ]);
            return {
                exams,
                total,
                totalPages: Math.ceil(total / PAGE_SIZE),
            };
        },
        [`category-exams-v2-${slug}-${query.toLowerCase()}-${page}`],
        { revalidate: 3600, tags: ["exams"] }
    )();

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { q = "", page = "0" } = await searchParams;
    const query = normalizeQuery(q);
    const currentPage = Math.max(0, parseInt(page, 10) || 0);



    // 2. Fetch Category info and exams in parallel
    // We fetch category directly so we always have the most fresh metadata (color, description)
    const [category, examPage, isAdmin] = await Promise.all([
        prisma.examCategory.findUnique({ where: { slug: id } }),
        getExamsData(id, query, currentPage),
        getIsAdmin()
    ]);

    // console.log("Exams: ", exams);

    if (!category) notFound();
    if (
        currentPage > 0 &&
        currentPage >= Math.max(examPage.totalPages, 1)
    ) {
        redirect(
            categoryPageHref(
                id,
                query,
                Math.max(0, examPage.totalPages - 1)
            )
        );
    }
    const { exams, totalPages } = examPage;

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                <div className="mb-12">
                    <Link
                        href="/library/category"
                        className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                    >
                        <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                        Back to Categories
                    </Link>
                    {isAdmin && (
                        <Link
                            href={`/library/exam/new?categoryId=${category.id}`}
                            className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                            title="Add New Exam"
                        >
                            <Plus className="w-6 h-6" />
                        </Link>
                    )}

                    <div className="max-w-3xl">
                        {/* We use the category data fetched on THIS page */}
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4 italic">
                            {category.name} <span className="text-muted-foreground font-light not-italic">Exams</span>
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {category.description || `Explore specialized ${category.name} exam resources.`}
                        </p>
                    </div>
                </div>

                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={query} />
                    </div>
                </div>

                {exams.length > 0 ? (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                        {exams.map((exam) => {
                            // 🔥 FIX: Bind the actions here, inside the map where `exam.id` exists

                            const boundDelete = deleteExam.bind(null, exam.id);
                            return (
                                <ExamCarouselCard
                                    key={exam.id}
                                    id={exam.id}
                                    name={exam.name}
                                    slug={exam.slug}
                                    description={exam.description || ""}
                                    tags={exam.tags.map(t => t.tag.name)}
                                    categoryName={category.name}
                                    accentColor={category.color}
                                    totalMarks={exam.totalMarks}
                                    duration={exam.duration}
                                    isAdmin={isAdmin}
                                    onDelete={boundDelete}
                                    syllabus={Object.values(
                                        exam.syllabusEntries.reduce((acc, entry) => {
                                            const categoryName = entry.category.name;
                                            const leafName = entry.topicPath.split('>').at(-1)!.trim();

                                            // If the category doesn't exist in our accumulator yet, create it
                                            if (!acc[categoryName])
                                            {
                                                acc[categoryName] = {
                                                    category: categoryName,
                                                    topics: []
                                                };
                                            }

                                            // Push the current topic into that category's array
                                            acc[categoryName].topics.push(leafName);

                                            return acc;
                                        }, {} as Record<string, { category: string; topics: string[] }>)
                                    )}
                                />
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <>
                            <PaginationPrefetch
                                nextHref={
                                    currentPage < totalPages - 1
                                        ? categoryPageHref(
                                            id,
                                            query,
                                            currentPage + 1
                                        )
                                        : undefined
                                }
                            />
                            <div className="flex items-center justify-center gap-3 mt-16">
                                {currentPage > 0 && (
                                    <Link
                                        href={categoryPageHref(
                                            id,
                                            query,
                                            currentPage - 1
                                        )}
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
                                        href={categoryPageHref(
                                            id,
                                            query,
                                            currentPage + 1
                                        )}
                                        prefetch={true}
                                        className="px-5 py-2.5 text-sm font-bold text-muted-foreground bg-card border border-border rounded-xl hover:border-slate-400 transition-colors"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        </>
                    )}
                    </>
                ) : (
                    <div className="col-span-full p-12 border-2 border-dashed border-border rounded-[2rem] text-center bg-card max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-muted-foreground/60 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-foreground tracking-tight">No exams found</h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            We couldn&apos;t find any exams in {category.name} matching <span className="font-bold text-foreground">&ldquo;{query}&rdquo;</span>.
                        </p>
                        {
                            <Link
                                href={`/library/category/${id}`}
                                className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-muted text-foreground/80 text-sm font-bold rounded-xl hover:bg-muted transition-colors"
                            >
                                Clear search
                            </Link>
                        }
                    </div>
                )}
            </main>
        </div>
    );
}
