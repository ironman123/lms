"use client"; // <-- 1. Make it a Client Component

import { useState, use } from "react"; // <-- 2. Import useState and use
import ExamCard from "@/components/ExamCard";
import { DUMMY_EXAMS, KPSC_CATEGORIES } from "@/constants";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import SearchFilter from "@/components/SearchFilter";

export default function CategoryPage({
    params,
}: {
    params: Promise<{ id: string }>;
    // 3. Removed searchParams from props since we don't need the URL anymore
}) {
    // 4. Unwrap the params using React.use() for Next.js 15 compatibility
    const { id } = use(params);

    // 5. Initialize local state for search
    const [searchQuery, setSearchQuery] = useState("");

    // 6. Find the specific category details
    const category = KPSC_CATEGORIES.find((c) => c.slug === id);

    if (!category)
    {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-slate-900">Category Not Found</h2>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    // 7. Filter exams by category ID FIRST, then by the local search query
    let filteredExams = DUMMY_EXAMS.filter((e) => e.categoryId === id);

    if (searchQuery)
    {
        const lowerQuery = searchQuery.toLowerCase();
        filteredExams = filteredExams.filter(e =>
            e.name.toLowerCase().includes(lowerQuery) ||
            e.description.toLowerCase().includes(lowerQuery)
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            {/* Back Button & Header */}
            <div className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm text-slate-400 hover:text-slate-900 transition-colors mb-6"
                >
                    <ChevronLeft size={16} className="mr-1" /> Back to Library
                </Link>

                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    {category.name} <span className="text-slate-400 font-light">Exams</span>
                </h1>
                <p className="mt-2 text-slate-500 max-w-2xl leading-relaxed">
                    {category.description}
                </p>
            </div>

            {/* Render the Search Bar using Local State */}
            <div className="flex justify-center mb-16 w-full">
                <div className="w-full max-w-md">
                    {/* 8. Pass state to SearchFilter. No Suspense needed for local state! */}
                    <SearchFilter
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>
            </div>

            {/* Exam Grid */}
            {filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredExams.map((exam) => (
                        <ExamCard
                            key={exam.id}
                            id={exam.id}
                            name={exam.name}
                            description={exam.description}
                            tags={exam.tags}
                            duration={exam.duration}
                            totalMarks={exam.totalMarks}
                            color={exam.color}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                    <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                    <p className="text-slate-500 font-medium text-lg">
                        {searchQuery ? `No exams found matching "${searchQuery}"` : "No exams found in this category yet."}
                    </p>
                    {searchQuery && (
                        /* 9. Update Clear Search to reset state instead of navigating */
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-4 inline-block text-blue-600 font-medium hover:underline cursor-pointer"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}
        </main>
    );
}