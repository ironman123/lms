import prisma from "@/lib/prisma";
import NewExamForm from "@/components/NewExamForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ categoryId?: string }> }) {
    // Fetch categories here. Since this is a Server Component, 
    // this code runs on the backend, not the user's browser.

    const { categoryId } = await searchParams;

    const categories = await prisma.examCategory.findMany({
        select: {
            id: true,
            name: true,
            color: true,
        },
        orderBy: { name: 'asc' }
    });



    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-5xl mx-auto px-4">

                {/* Back Link */}
                <Link
                    href="/library/exam"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Exams
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Create <span className="text-slate-400 font-light">New Exam</span>
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Add a new exam classification like "Degree Level", "Technical", or "10th Level".
                    </p>
                </div>

                {/* Pass the data down as a prop */}
                <NewExamForm categories={categories} defaultCategoryId={categoryId} />
            </div>
        </div>
    );

}