// app/library/exam/[id]/paper/[paperId]/(session)/[mode]/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ActiveSessionClient from "@/components/ActiveSessionClient";

export default async function SessionPage({
    params
}: {
    params: Promise<{ id: string, paperId: string, mode: 'practice' | 'mock' }>
}) {
    const { paperId, mode } = await params;

    const paperData = await prisma.questionPaper.findUnique({
        where: { id: paperId },
        include: {
            exam: true,
            questions: {
                orderBy: { createdAt: 'asc' }, // Ensure consistent order
                include: {
                    options: true,
                    topic: { select: { name: true } }
                }
            }
        }
    });

    if (!paperData) notFound();

    return (
        <ActiveSessionClient
            paper={paperData}
            mode={mode}
        />
    );
}