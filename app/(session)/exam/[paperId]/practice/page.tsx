import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";

export default async function PracticeSessionPage({
    params,
}: {
    params: Promise<{ paperId: string }>;
}) {
    const { paperId } = await params;

    const paper = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: {
            examQuestionPaperLinks: {
                include: { exam: { select: { name: true, duration: true } } },
                take: 1,
            },
            questions: {
                orderBy: { createdAt: "asc" },
                include: { options: true },
            },
        },
    });

    if (!paper) notFound();

    return (
        <ActiveSessionClient
            paper={paper}
            mode="practice"
            sessionId=""       // no session for practice
            userId=""
        />
    );
}