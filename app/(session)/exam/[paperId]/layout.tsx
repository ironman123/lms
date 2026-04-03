import { X } from "lucide-react";
import Link from "next/link";
import SessionTimer from "@/components/SessionTimer";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PaperSessionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ paperId: string }>;
}) {
    const { paperId } = await params;

    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: {
            examQuestionPaperLinks: {
                include: { exam: { select: { slug: true, name: true, duration: true } } },
                take: 1,
            },
        },
    });

    if (!paper) notFound();

    const exam = paper.examQuestionPaperLinks[0]?.exam;
    const durationSeconds = (exam?.duration ?? 60) * 60;

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href={exam ? `/exam/${paperId}/lobby` : "/library/paper"}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </Link>
                    <div className="h-6 w-px bg-slate-200" />
                    <h2 className="font-black text-slate-900 tracking-tight text-sm uppercase">
                        {paper.title}
                    </h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto justify-center">
                {children}
            </div>
        </div>
    );
}