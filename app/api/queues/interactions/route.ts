import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import prisma from "@/lib/prisma";

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export interface InteractionPayload {
    sessionId: string;
    userId: string;
    metrics: Array<{
        questionId: string;
        selectedAnswer: string | null;
        isCorrect: boolean;
        visitCount: number;
        dwellTimeSeconds: number;
        hesitationCount: number;
        isFlagged: boolean;
        wasHinted: boolean;
    }>;
}

export async function POST(req: NextRequest) {
    const body = await req.text();

    // Verify it's actually from QStash
    const isValid = await receiver.verify({
        signature: req.headers.get("upstash-signature") ?? "",
        body,
    });
    if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload: InteractionPayload = JSON.parse(body);
    const { sessionId, metrics } = payload;

    // Single raw SQL upsert — replaces 100 updateMany calls
    // inside the POST handler, replace the $executeRaw with:
    await Promise.all(
        metrics.map(m =>
            prisma.questionInteraction.updateMany({
                where: { sessionId, questionId: m.questionId },
                data: {
                    selectedAnswer: m.selectedAnswer ?? null,
                    isCorrect: m.isCorrect,
                    visitCount: m.visitCount,
                    totalDwellTime: m.dwellTimeSeconds,
                    hesitationCount: m.hesitationCount,
                    isFlagged: m.isFlagged,
                    wasHinted: m.wasHinted,
                },
            })
        )
    );

    return NextResponse.json({ ok: true });
}