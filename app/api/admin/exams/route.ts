// app/api/admin/exams/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
    try {
        // Never use the five-minute profile cache for authorization. A role
        // change must take effect on the very next request.
        await requireAdmin();
    } catch (error) {
        const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 403;
        return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
    }

    const exams = await prisma.exam.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(exams);
}
