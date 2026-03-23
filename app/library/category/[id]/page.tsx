import ExamCard from "@/components/ExamCard"; // Adjust path if needed
import { DUMMY_EXAMS, KPSC_CATEGORIES } from "@/constants";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SearchFilter from "@/components/SearchFilter"; // <-- Import the new component

export default async function CategoryPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>; // <-- Add searchParams type
}) {
    // 1. Resolve params and searchParams
    const { id } = await params;
    const { q: query } = await searchParams;

    // 2. Find the specific category details
    const category = KPSC_CATEGORIES.find((c) => c.id === id);

    if (!category)
    {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-slate-900">Category Not Found</h2>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    // 3. Filter exams by category ID
    let exams = DUMMY_EXAMS.filter((e) => e.categoryId === id);

    // 4. If there is a search query, filter the exams further
    if (query)
    {
        const lowerQuery = query.toLowerCase();
        exams = exams.filter(e =>
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

            {/* Render the Search Bar */}
            <SearchFilter />

            {/* Exam Grid */}
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {exams.map((exam) => (
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
                    <p className="text-slate-500 font-medium text-lg">
                        {query ? `No exams found matching "${query}"` : "No exams found in this category yet."}
                    </p>
                    {query && (
                        <Link href={`/category/${id}`} className="mt-2 inline-block text-blue-600 hover:underline">
                            Clear search
                        </Link>
                    )}
                </div>
            )}
        </main>
    );
}