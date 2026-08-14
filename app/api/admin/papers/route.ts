// app/api/admin/papers/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        // This endpoint feeds authoring controls, so it must observe role
        // revocations immediately instead of relying on the profile cache.
        await requireAdmin();
    } catch (error) {
        const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 403;
        return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
    }

    const examId = req.nextUrl.searchParams.get("examId");
    if (!examId) return NextResponse.json([], { status: 200 });

    const links = await prisma.examQuestionPaperLink.findMany({
        where: { examId },
        include: {
            paper: { select: { id: true, title: true, year: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links.map((l) => l.paper));
}
