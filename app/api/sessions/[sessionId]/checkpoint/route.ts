import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth";
import { persistSessionInteractions } from "@/lib/interaction-repository";
import { checkpointPayloadSchema } from "@/lib/session-interactions";
import prisma from "@/lib/prisma";
import { RESUMABLE_SESSION_STATUSES } from "@/lib/session-policy";
import { checkpointRatelimit } from "@/lib/ratelimit";

const MAX_CHECKPOINT_BODY_BYTES = 1_000_000;

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

    const { sessionId } = await context.params;
    try {
        const limit = await checkpointRatelimit.limit(
            `${user.id}:${sessionId}`
        );
        if (!limit.success) {
            return NextResponse.json(
                { error: "Checkpoint rate limit exceeded" },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(
                            Math.max(
                                1,
                                Math.ceil((limit.reset - Date.now()) / 1000)
                            )
                        ),
                    },
                }
            );
        }
    } catch (error) {
        // A Redis outage must not destroy a student's local recovery path.
        console.error(JSON.stringify({
            event: "checkpoint_rate_limit_unavailable",
            sessionId,
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
        }));
    }

    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (
        Number.isFinite(declaredLength) &&
        declaredLength > MAX_CHECKPOINT_BODY_BYTES
    ) {
        return NextResponse.json(
            { error: "Checkpoint payload too large" },
            { status: 413 }
        );
    }

    let json: unknown;
    try {
        const body = await req.text();
        if (
            new TextEncoder().encode(body).byteLength >
            MAX_CHECKPOINT_BODY_BYTES
        ) {
            return NextResponse.json(
                { error: "Checkpoint payload too large" },
                { status: 413 }
            );
        }
        json = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = checkpointPayloadSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const startedAt = performance.now();
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
    if (result.status === "inactive") {
        return NextResponse.json(
            { error: "Session is no longer active" },
            { status: 409 }
        );
    }

    await prisma.testSession.updateMany({
        where: {
            id: sessionId,
            userId: user.id,
            status: { in: [...RESUMABLE_SESSION_STATUSES] },
        },
        data: { lastCheckpointAt: new Date() },
    });

    const durationMs = Math.round(performance.now() - startedAt);
    return NextResponse.json(
        {
            ok: true,
            revision: parsed.data.revision,
            upserted: result.upserted,
        },
        {
            headers: {
                "Server-Timing": `checkpoint;dur=${durationMs}`,
            },
        }
    );
}
