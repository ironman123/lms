// app/library/category/page.tsx (or wherever this file lives)
"use client"; // <-- 1. Make this a Client Component

import { useState } from "react"; // <-- 2. Import useState
import { KPSC_CATEGORIES } from "@/constants";
import ExamCategoryCard from "@/components/ExamCategoryCard";
import SearchFilter from "@/components/SearchFilter";
import { Search } from "lucide-react";

export default function CategoryIndexPage() {
    // 3. Initialize local state for the search query
    const [searchQuery, setSearchQuery] = useState("");

    // 4. Filter the categories instantly based on local state
    const filteredCategories = KPSC_CATEGORIES.filter(category => {
        const lowerQuery = searchQuery.toLowerCase();
        return (
            category.name.toLowerCase().includes(lowerQuery) ||
            category.description.toLowerCase().includes(lowerQuery)
        );
    });

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

                {/* 5. Pass the state and setter down to the SearchFilter */}
                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
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
                    <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">No categories found</h3>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            We couldn't find any categories matching "{searchQuery}". Try adjusting your search term.
                        </p>
                        {/* 6. Change the 'Clear search' button to just reset the state */}
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Clear search
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}