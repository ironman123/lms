import prisma from "@/lib/prisma";
import SyllabusDropdown from "@/components/SyllabusDropdown";
import ExamWorkspace from "@/components/ExamWorkspace";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

const getCachedExam = unstable_cache(
    async (slug: string) => {
        return await prisma.exam.findUnique({
            where: { slug },
            include: {
                examCategory: true,
                tags: { include: { tag: true } },
                syllabusEntries: {
                    include: { category: true },
                    //orderBy: { topicPath: 'asc' },
                },
                examQuestionPaperLinks: {
                    include: {
                        paper: true // This grabs the actual QuestionPaper data!
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        });
    },
    ["exam-detail-view"],
    { revalidate: 3600, tags: ["exams"] }
);

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ExamPage({ params }: PageProps) {
    const { id: slug } = await params;
    const currentExam = await getCachedExam(slug);

    //----DUMMY----Mock for now///
    const isAdmin = true;

    if (!currentExam) notFound();

    // Transform flat syllabusEntries into grouped format for components
    const formattedSyllabus = Object.values(
        currentExam.syllabusEntries.reduce((acc, entry) => {
            const categoryName = entry.category.name;

            if (!acc[categoryName])
            {
                acc[categoryName] = {
                    category: categoryName,
                    topics: []
                };
            }

            // Show the leaf name (last segment of the path)
            const leafName = entry.topicPath.split('>').at(-1)!.trim();
            acc[categoryName].topics.push(leafName);
            return acc;
        }, {} as Record<string, { category: string; topics: string[] }>)
    );

    // 🔥 FIX: Extract the papers array from the link table!
    const questionPapers = currentExam.examQuestionPaperLinks.map(link => link.paper);

    // Now use `questionPapers` for all your math and filtering:
    const pyqCount = questionPapers.filter(p => p.year !== null).length;
    const mockCount = questionPapers.filter(p => p.year === null).length;

    const dbTabs = [
        { id: "all", label: "All Papers", count: questionPapers.length },
        { id: "pyq", label: "PYQs", count: pyqCount },
        { id: "mock", label: "Mocks", count: mockCount },
        { id: "notes", label: "Notes", count: 0 },
    ];

    const fetchedPapers = questionPapers.map(paper => ({
        id: paper.id,
        title: paper.title,
        type: paper.year ? "PYQ" : "Mock",
        year: paper.year?.toString() || "2026",
        duration: currentExam.duration,
        shift: "General",
        pricing: "Free",
        subject: "General",
    }));

    const dbFilterOptions = {
        years: Array.from(new Set(fetchedPapers.map(p => p.year))),
        shifts: ["Morning", "Afternoon", "Evening"],
        pricing: ["Free", "Paid"],
        subjects: formattedSyllabus.map(s => s.category),
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                <div className="mb-8 md:mb-10">
                    <Link
                        href={`/library/category/${currentExam.examCategory?.slug}`}
                        className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-6 group"
                    >
                        <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-1" />
                        Back to {currentExam.examCategory?.name}
                    </Link>

                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight italic block">
                        {currentExam.name} <span className="text-slate-400 font-light not-italic">Workspace</span>
                    </h1>
                    {isAdmin && (
                        <Link
                            href={`/library/exam/${currentExam.id}/edit`}
                            className="inline-flex mt-3 mb-2 items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
                        >
                            <Pencil size={14} />
                            Edit Exam
                        </Link>
                    )}

                    <p className="mt-2 text-slate-500 max-w-2xl leading-relaxed text-sm sm:text-base">
                        {currentExam.description}
                    </p>
                </div>

                <div className="flex flex-col w-full gap-6 xl:gap-8 items-start">
                    <section className="w-full shrink-0">
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                            <div
                                className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 rounded-full"
                                style={{ backgroundColor: currentExam.color }}
                            />
                            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between relative z-10">
                                Detailed Syllabus
                                <span className="text-[10px] uppercase tracking-widest font-black px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">
                                    {formattedSyllabus.length} Modules
                                </span>
                            </h2>
                            <SyllabusDropdown data={formattedSyllabus} />
                        </div>
                    </section>

                    <section className="w-full flex-1 min-w-0">
                        <ExamWorkspace
                            examId={currentExam.id}
                            examSlug={currentExam.slug}
                            papers={fetchedPapers}
                            tabs={dbTabs}
                            filterOptions={dbFilterOptions}
                        />
                    </section>
                </div>
            </main>
        </div>
    );
}