import prisma from "@/lib/prisma";
import NewExamForm from "@/components/NewExamForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditExamPage({ params }: PageProps) {
    const { id } = await params;

    const [exam, categories] = await Promise.all([
        prisma.exam.findUnique({
            where: { id },
            include: {
                tags: { include: { tag: true } },
                syllabusEntries: {
                    include: { category: true },
                    orderBy: { topicPath: 'asc' },
                },
            },
        }),
        prisma.examCategory.findMany({
            select: { id: true, name: true, color: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    if (!exam) notFound();

    // Transform DB data back into form shape
    const syllabusMap = new Map<string, string[]>();
    for (const entry of exam.syllabusEntries)
    {
        const cat = entry.category.name;
        if (!syllabusMap.has(cat)) syllabusMap.set(cat, []);
        syllabusMap.get(cat)!.push(entry.topicPath);
    }

    const initialData = {
        id: exam.id,
        name: exam.name,
        description: exam.description ?? '',
        examCategoryId: exam.examCategoryId ?? '',
        categoryNumber: exam.categoryNumber ?? '',
        tags: exam.tags.map(t => t.tag.name),
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        syllabus: Array.from(syllabusMap.entries()).map(([category, topics]) => ({
            category,
            topics,
        })),
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-5xl mx-auto px-4">
                <Link
                    href={`/library/exam/${exam.slug}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to {exam.name}
                </Link>

                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Edit <span className="text-slate-400 font-light">{exam.name}</span>
                    </h1>
                </div>

                <NewExamForm categories={categories} initialData={initialData} />
            </div>
        </div>
    );
}