// app/api/admin/exams/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getIsAdmin } from "@/lib/auth";

export async function GET() {
    const isAdmin = await getIsAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const exams = await prisma.exam.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(exams);
}