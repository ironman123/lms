import prisma from "@/lib/prisma";
import ExamCategoryCard from "@/components/ExamCategoryCard";
import SearchFilter from "@/components/SearchFilter"; // We'll update this next
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";

const getCachedCategories = unstable_cache(
    async (query: string) => {
        return await prisma.examCategory.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    ["categories-list"], // 2. A unique key for this cache
    {
        revalidate: 3600, // 3. Re-check every 1 hour (as a fallback)
        tags: ["examCategories"] // 4. A "Tag" so we can manually clear it later
    }
);

// Next.js 15 provides searchParams directly to the page props
export default async function CategoryIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const query = (await searchParams).q || "";
    const categories = await getCachedCategories(query);

    // Fetch real data from Supabase/Prisma
    // const categories = await prisma.examCategory.findMany({
    //     where: {
    //         OR: [
    //             { name: { contains: query, mode: 'insensitive' } },
    //             { description: { contains: query, mode: 'insensitive' } },
    //         ],
    //     },
    //     orderBy: { createdAt: 'desc' },
    // });

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                {/* Header Section */}
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Browse <span className="text-slate-400 font-light">Categories</span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Select your specialized field to discover tailored exam workspaces, previous year questions, and dedicated mock tests.
                    </p>
                </div>

                <Link
                    href="/library/category/new"
                    className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                    title="Add New Category"
                >
                    <Plus className="w-6 h-6" />
                </Link>

                {/* Search Section: The Client Component Bridge */}
                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={query} />
                    </div>
                </div>

                {/* Grid or Empty State */}
                {categories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                        {categories.map((cat) => (
                            <ExamCategoryCard key={cat.id} {...cat} />
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No categories found</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            We couldn't find any categories matching <span className="font-bold text-slate-900">"{query}"</span>. Try adjusting your search term.
                        </p>
                        {/* 6. Change the 'Clear search' button to just reset the state */}
                        <Link
                            href="/library/category"
                            scroll={false}
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