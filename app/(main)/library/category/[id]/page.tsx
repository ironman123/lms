// app/library/category/[id]/page.tsx

import prisma from "@/lib/prisma";
import ExamCarouselCard from "@/components/ExamCarouselCard";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

// 1. Create a dynamic cache function that includes the query in the key
const getExamsData = (slug: string, query: string) =>
    unstable_cache(
        async () => {
            return await prisma.exam.findMany({
                where: {
                    examCategory: { slug: slug },
                    ...(query ? {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                        ]
                    } : {})
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
                    examTopics: {
                        include: {
                            topic: {
                                include: {
                                    category: true // This grabs the parent Category (e.g., "Math") for this topic
                                }
                            }
                        }
                    },
                },
                orderBy: { createdAt: 'desc' }
            });
        },
        [`exams-${slug}-${query}`], // Dynamic key ensures search results are cached correctly
        { revalidate: 3600, tags: ["exams"] }
    )();

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
    const { id } = await params; // This is the slug (e.g., 'general')
    const query = (await searchParams).q || "";

    // 2. Fetch Category info and exams in parallel
    // We fetch category directly so we always have the most fresh metadata (color, description)
    const [category, exams] = await Promise.all([
        prisma.examCategory.findUnique({ where: { slug: id } }),
        getExamsData(id, query)
    ]);
    console.log("Exams: ", exams);

    if (!category) notFound();

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                <div className="mb-12">
                    <Link
                        href="/library/category"
                        className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
                    >
                        <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                        Back to Categories
                    </Link>

                    <div className="max-w-3xl">
                        {/* We use the category data fetched on THIS page */}
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 italic">
                            {category.name} <span className="text-slate-400 font-light not-italic">Exams</span>
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
                        {exams.map((exam) => (
                            <ExamCarouselCard
                                key={exam.id}
                                name={exam.name}
                                slug={exam.slug}
                                description={exam.description || ""}
                                tags={exam.tags.map(t => t.tag.name)}
                                categoryName={category.name}
                                accentColor={category.color}
                                totalMarks={exam.totalMarks}
                                duration={exam.duration}
                                syllabus={Object.values(
                                    exam.examTopics.reduce((acc, current) => {
                                        const categoryName = current.topic.category.name;
                                        const topicName = current.topic.name;

                                        // If the category doesn't exist in our accumulator yet, create it
                                        if (!acc[categoryName])
                                        {
                                            acc[categoryName] = {
                                                category: categoryName,
                                                topics: []
                                            };
                                        }

                                        // Push the current topic into that category's array
                                        acc[categoryName].topics.push(topicName);

                                        return acc;
                                    }, {} as Record<string, { category: string; topics: string[] }>)
                                )}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center bg-white max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No exams found</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            We couldn't find any exams in {category.name} matching <span className="font-bold text-slate-900">"{query}"</span>.
                        </p>
                        {
                            <Link
                                href={`/library/category/${id}`}
                                className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
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