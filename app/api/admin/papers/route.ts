// app/api/admin/papers/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getIsAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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