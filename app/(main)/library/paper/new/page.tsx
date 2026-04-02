//exam/[id]/paper/new/page.tsx
import PaperBuilder from "@/components/PaperBuilder";
import prisma from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ examId?: string }>; // Add searchParams to the interface
}

export default async function NewPaperPage({ params, searchParams }: PageProps) {

    const allExams = await prisma.exam.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' }
    });
    const globalSyllabus = await prisma.examSyllabusEntry.findMany({
        distinct: ['topicPath'],
        select: {
            id: true,
            topicPath: true,
            categoryId: true,
            category: { select: { name: true } },
            topicId: true,
        },
        orderBy: { topicPath: "asc" },
    });

    return (
        <div className="min-h-screen w-full bg-[#F8F7F4]" >
            <div className="max-w-3xl mx-auto px-4 pt-8">
                <Link
                    href={`/library/paper`}
                    className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
                >
                    <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                    Back to Papers
                </Link>
            </div>

            {/* Use the validated data from the database query to feed your builder */}
            <PaperBuilder
                syllabusEntries={globalSyllabus}
                exams={allExams}
            />
        </div >
    );
}