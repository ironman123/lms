// app/library/exam/[id]/page.tsx
import SyllabusDropdown from "@/components/SyllabusDropdown";
import ExamWorkspace from "@/components/ExamWorkspace";
import { DUMMY_EXAMS } from "@/constants/index";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ExamPage({ params }: PageProps) {
    const { id } = await params;

    const currentExam = DUMMY_EXAMS.find((exam) => exam.id === id);

    if (!currentExam)
    {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
                <h2 className="text-2xl font-bold text-slate-900">Exam Not Found</h2>
                <Link href="/" className="mt-4 text-blue-600 hover:underline">
                    Return to Library
                </Link>
            </div>
        );
    }

    return (
        /* 1. Added bg-slate-50 to the wrapper so the white cards stand out */
        <div className="min-h-screen bg-slate-50">
            {/* 2. Increased max-w to 1400px for better wide-screen usage */}
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* Header Section */}
                <div className="mb-8 md:mb-10">
                    <Link
                        href={`/library/category/${currentExam.categoryId}`}
                        className="inline-flex items-center text-sm text-slate-400 hover:text-slate-700 transition-colors mb-6"
                    >
                        <ChevronLeft size={16} className="mr-1" /> Back to Category
                    </Link>

                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        {currentExam.name} <span className="text-slate-400 font-light">Workspace</span>
                    </h1>
                    <p className="mt-2 text-slate-500 max-w-2xl leading-relaxed text-sm sm:text-base">
                        {currentExam.description}
                    </p>
                </div>

                {/* Layout Container */}
                <div className="flex flex-col w-full gap-6 xl:gap-8 items-start">

                    {/* Left Sidebar: Syllabus */}
                    {/* 3. Changed from lg:w-1/3 to a fixed width so the workspace has more room */}
                    <section className="w-full lg:w-full shrink-0">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 lg:sticky lg:top-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
                                Syllabus
                                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">
                                    {currentExam.syllabus?.length || 0} Modules
                                </span>
                            </h2>
                            <SyllabusDropdown data={currentExam.syllabus || []} />
                        </div>
                    </section>

                    {/* Right Main Area: Workspace */}
                    {/* flex-1 allows this section to fill all remaining space safely */}
                    <section className="w-full flex-1 min-w-0">
                        <ExamWorkspace examId={currentExam.id} />
                    </section>

                </div>
            </main>
        </div>
    );
}