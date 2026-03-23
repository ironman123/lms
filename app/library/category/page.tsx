import { KPSC_CATEGORIES } from "@/constants";
import ExamCategoryCard from "@/components/ExamCategoryCard";
import SearchFilter from "@/components/SearchFilter"; // <-- 1. Import the SearchFilter
import Link from "next/link";
import { Search } from "lucide-react";

// Note: Ensure searchParams is typed as a Promise for Next.js 15 compatibility
export default async function CategoryIndexPage({
    searchParams
}: {
    searchParams: Promise<{ q?: string }>
}) {
    // 2. Await the searchParams and extract the query
    const { q: query } = await searchParams;

    // 3. Filter the categories based on the search query
    let filteredCategories = KPSC_CATEGORIES;
    if (query)
    {
        const lowerQuery = query.toLowerCase();
        filteredCategories = filteredCategories.filter(category =>
            category.name.toLowerCase().includes(lowerQuery) ||
            category.description.toLowerCase().includes(lowerQuery)
        );
    }

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

                {/* 4. Render the Search Bar (Centered to match the header) */}
                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter />
                    </div>
                </div>

                {/* Categories Grid or Empty State */}
                {filteredCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                        {filteredCategories.map((category) => (
                            <ExamCategoryCard
                                key={category.id}
                                id={category.id}
                                name={category.name}
                                description={category.description}
                                icon={category.icon}
                                image={category.image}
                                color={category.color}
                            />
                        ))}
                    </div>
                ) : (
                    /* 5. Premium Empty State if no categories match the search */
                    <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No categories found</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            We couldn't find any categories matching "{query}". Try adjusting your search term.
                        </p>
                        <Link
                            href="/library/category" // <-- Update this to the exact path of this index page
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