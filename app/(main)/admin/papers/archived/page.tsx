import Link from "next/link";
import { ArchiveRestore, ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { restoreQuestionPaperFromForm } from "@/app/(main)/actions/paper-actions";

export default async function ArchivedPapersPage() {
    const papers = await prisma.questionPaper.findMany({
        where: { isArchived: true },
        orderBy: { archivedAt: "desc" },
        include: {
            _count: { select: { questions: true, moderationCases: true } },
        },
    });

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Paper lifecycle
            </p>
            <h2 className="mt-2 text-3xl font-black">Archived papers</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                Archived papers are hidden from students and cannot start new
                sessions. Historical attempts and moderation records remain
                intact.
            </p>

            <div className="mt-7 space-y-3">
                {papers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                        No archived papers.
                    </div>
                ) : (
                    papers.map((paper) => (
                        <article
                            key={paper.id}
                            className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center"
                        >
                            <div>
                                <h3 className="font-black">{paper.title}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {paper._count.questions} questions ·{" "}
                                    {paper._count.moderationCases} moderation
                                    cases
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/library/paper/${paper.id}/edit`}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted"
                                >
                                    Inspect
                                    <ExternalLink size={14} />
                                </Link>
                                <form action={restoreQuestionPaperFromForm}>
                                    <input
                                        type="hidden"
                                        name="paperId"
                                        value={paper.id}
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
                                    >
                                        <ArchiveRestore size={14} />
                                        Restore
                                    </button>
                                </form>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </main>
    );
}
