import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth";
import { persistSessionInteractions } from "@/lib/interaction-repository";
import { checkpointPayloadSchema } from "@/lib/session-interactions";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ sessionId: string }> }
) {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const user = await getOptionalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = checkpointPayloadSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { sessionId } = await context.params;
    const result = await persistSessionInteractions({
        sessionId,
        userId: user.id,
        metrics: parsed.data.metrics,
        checkpointRevision: parsed.data.revision,
        requireActive: true,
    });

    if (result.status === "not_found") {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (result.status === "completed") {
        return NextResponse.json(
            { error: "Session already submitted" },
            { status: 409 }
        );
    }

    return NextResponse.json({
        ok: true,
        revision: parsed.data.revision,
        upserted: result.upserted,
    });
}
