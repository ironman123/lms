import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getOperationalReadiness } from "@/lib/operational-readiness";

// Kept at the existing URL for operational continuity. It deliberately exposes
// only boolean readiness—not paths, public-key names, or secret values.
export async function GET() {
    try {
        await requireAdmin();
    } catch (error) {
        const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 403;
        return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
    }
    return NextResponse.json(getOperationalReadiness());
}
