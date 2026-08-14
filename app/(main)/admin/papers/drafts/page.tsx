import Link from "next/link";
import prisma from "@/lib/prisma";
import DiscardDraftPaperButton from "@/components/DiscardDraftPaperButton";

export default async function DraftPapersPage() {
    const drafts = await prisma.questionPaper.findMany({
        where: { status: "DRAFT", isArchived: false },
        select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { questions: { where: { isArchived: false } } } },
            examQuestionPaperLinks: {
                select: { exam: { select: { name: true } } },
                take: 3,
            },
        },
        orderBy: { updatedAt: "desc" },
    });
    return (
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Paper authoring</p>
            <h2 className="mt-2 text-3xl font-black">Draft papers</h2>
            <p className="mt-2 text-sm text-muted-foreground">Drafts cannot be started by students. Finish validation and publish them from the editor.</p>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
                {drafts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground md:col-span-2">There are no unfinished paper drafts.</div>
                ) : drafts.map((paper) => (
                    <article key={paper.id} className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Draft · {paper._count.questions} questions</p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-black">{paper.title}</h3>
                        <p className="mt-2 text-xs text-muted-foreground">{paper.examQuestionPaperLinks.map((link) => link.exam.name).join(", ") || "Standalone paper"}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link href={`/library/paper/${paper.id}/edit`} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-xs font-black text-primary-foreground">Continue editing</Link>
                            <DiscardDraftPaperButton id={paper.id} title={paper.title} />
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}
