import prisma from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaperBuilder from "@/components/PaperBuilder";
import { requireAdminPage } from "@/lib/auth";

interface PageProps {
    params: Promise<{ id: string; paperId: string }>;
}

export default async function EditPaperPage({ params }: PageProps) {
    await requireAdminPage(); // Ensure only admins can access this page
    const { id: examSlug, paperId } = await params;

    const [paper, allExams] = await Promise.all([
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                questions: {
                    include: { options: true },
                    orderBy: { createdAt: "asc" },
                },
                examQuestionPaperLinks: {
                    include: { exam: true },
                },
            },
        }),
        prisma.exam.findMany({
            select: { id: true, name: true },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    if (!paper) notFound();

    // Find the exam matching the slug, fallback to first linked exam
    const currentExam =
        paper.examQuestionPaperLinks.find(link => link.exam.slug === examSlug)?.exam
        ?? paper.examQuestionPaperLinks[0]?.exam
        ?? null;

    const linkedExamIds = paper.examQuestionPaperLinks.map(l => l.examId);

    const syllabusEntries = currentExam
        ? await prisma.examSyllabusEntry.findMany({
            where: { examId: currentExam.id },
            select: {
                id: true,
                topicPath: true,
                categoryId: true,
                category: { select: { name: true } },
                topicId: true,
            },
            orderBy: { topicPath: "asc" },
        })
        : [];

    // Questions belong to QuestionPaper directly — not through the link table
    const initialQuestions = paper.questions.map((q, i) => ({
        id: q.id,
        number: i + 1,
        content: q.content,
        type: q.type as any,
        difficulty: q.difficulty as any,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        options: q.options.map((o, oi) => ({
            label: String.fromCharCode(65 + oi),
            text: o.text,
            isCorrect: o.isCorrect,
        })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topicPath: q.topicPath ?? "",
        topicId: q.topicId ?? "",
        categoryId: "",
        saved: true,
    }));

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            <div className="max-w-3xl mx-auto px-4 pt-8">
                <Link
                    href={currentExam ? `/library/exam/${currentExam.slug}` : "/library/paper"}
                    className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
                >
                    <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                    {currentExam ? `Back to ${currentExam.name}` : "Back to Papers"}
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Edit <span className="text-slate-400 font-light">{paper.title}</span>
                    </h1>
                </div>
            </div>

            <PaperBuilder
                examId={currentExam?.id}
                examSlug={currentExam?.slug ?? ""}
                syllabusEntries={syllabusEntries}
                exams={allExams}
                initialPaper={{ id: paper.id, title: paper.title, year: paper.year, type: paper.type }}
                initialQuestions={initialQuestions}
                linkedExamIds={linkedExamIds}
            />
        </div>
    );
}