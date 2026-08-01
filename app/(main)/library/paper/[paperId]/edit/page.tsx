import prisma from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaperBuilder, { type Question } from "@/components/PaperBuilder";
import { requireAdminPage } from "@/lib/auth";
import { OptionJSON } from "@/types/question";


interface PageProps {
    params: Promise<{ id: string; paperId: string }>;
    searchParams: Promise<{
        moderationCaseId?: string;
        reportedQuestionId?: string;
    }>;
}

export default async function EditPaperPage({ params, searchParams }: PageProps) {
    await requireAdminPage(); // Ensure only admins can access this page
    const { id: examSlug, paperId } = await params;
    const { moderationCaseId, reportedQuestionId } = await searchParams;

    const [paper, allExams] = await Promise.all([
        prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: {
                questions: {
                    where: { isArchived: false },
                    orderBy: { position: "asc" },
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

    // Questions belong to QuestionPaper directly — not through the link table
    const initialQuestions: Question[] = paper.questions.map((q, i) => {
        const options = (q.options ?? []) as OptionJSON[];

        return {
            clientId: q.id,
            id: q.id,
            number: i + 1,
            content: q.content,
            type: q.type,
            difficulty: q.difficulty,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            explanation: q.explanation,
            isCancelled: q.isCancelled,
            topicPath: q.topicPath ?? "",
            topicId: q.topicId ?? "",
            syllabusEntryId: q.syllabusEntryId ?? "",
            categoryId: "",
            saved: true,

            // MCQ / MSQ
            options: options.map((o) => ({
                index: o.index,
                label: String.fromCharCode(65 + o.index), // A, B, C, D
                text: o.text,
                imageUrl: o.imageUrl,
            })),
            correctOptions: q.correctOptions,  // Int[] directly from DB

            // NUMERICAL
            exactAnswer: q.exactAnswer ?? null,
            answerMin: q.answerMin ?? null,
            answerMax: q.answerMax ?? null,

            // SUBJECTIVE
            modelAnswer: q.modelAnswer ?? null,
        };
    });

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 pt-8">
                <Link
                    href={currentExam ? `/library/exam/${currentExam.slug}` : "/library/paper"}
                    className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                >
                    <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                    {currentExam ? `Back to ${currentExam.name}` : "Back to Papers"}
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Edit <span className="text-muted-foreground font-light">{paper.title}</span>
                    </h1>
                </div>
            </div>

            <PaperBuilder
                examId={currentExam?.id}
                examSlug={currentExam?.slug ?? ""}
                exams={allExams}
                initialPaper={{ id: paper.id, title: paper.title, year: paper.year, type: paper.type, contentRevision: paper.contentRevision, status: paper.status }}
                initialQuestions={initialQuestions}
                linkedExamIds={linkedExamIds}
                moderationCaseId={moderationCaseId}
                reportedQuestionId={reportedQuestionId}
            />
        </div>
    );
}
