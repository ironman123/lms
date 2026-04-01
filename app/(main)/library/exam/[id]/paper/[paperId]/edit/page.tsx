import prisma from "@/lib/prisma";
import PaperForm from "@/components/NewPaperForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string; paperId: string }>;
}

export default async function EditPaperPage({ params }: PageProps) {
    const { id: examSlug, paperId } = await params;

    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: { exam: true },
    });

    if (!paper) notFound();

    const initialData = {
        id: paper.id,
        title: paper.title,
        year: paper.year ?? undefined,
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <Link
                    href={`/library/exam/${examSlug}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to {paper.exam.name}
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Edit <span className="text-slate-400 font-light">{paper.title}</span>
                    </h1>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <PaperForm examId={paper.examId} examSlug={examSlug} initialData={initialData} />
                </div>
            </div>
        </div>
    );
}