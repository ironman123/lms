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
    // 1. Extract the slug from the URL path (e.g., /library/exam/temp-1)
    const { id: examSlug } = await params;

    // 2. Extract the examId from the query string (e.g., ?examId=...)
    const { examId } = await searchParams;

    const allExams = await prisma.exam.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' }
    });

    // 3. Query the database using the SLUG, not the ID!
    // const exam = await prisma.exam.findUnique({
    //     where: { slug: examSlug },
    //     select: { id: true, name: true, slug: true }
    // });

    const [exam, syllabusEntries] = await Promise.all([
        prisma.exam.findUnique({
            where: { slug: examSlug },
            select: { id: true, name: true, slug: true }
        }),
        prisma.examSyllabusEntry.findMany({
            where: { exam: { slug: examSlug } },
            select: {
                id: true,
                topicPath: true,
                categoryId: true,
                category: { select: { name: true } },
                topicId: true,
            },
            orderBy: { topicPath: "asc" },
        }),
    ]);

    if (!exam) notFound();

    return (
        <div className="min-h-screen bg-[#F8F7F4]" >
            <div className="max-w-3xl mx-auto px-4 pt-8">
                <Link
                    href={`/library/exam/${exam.slug}`}
                    className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
                >
                    <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                    Back to {exam.name}
                </Link>
            </div>

            {/* Use the validated data from the database query to feed your builder */}
            <PaperBuilder
                examId={exam.id}
                examSlug={exam.slug}
                syllabusEntries={syllabusEntries}
                exams={allExams}
            />
        </div >
    );
}