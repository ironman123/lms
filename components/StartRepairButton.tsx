"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";
import { createTodayRepairSession } from "@/app/(main)/actions/repair-actions";

export default function StartRepairButton({
    paperId,
    label = "Start repair",
}: {
    paperId: string;
    label?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div>
            <button
                type="button"
                disabled={isPending}
                onClick={() => {
                    setError(null);
                    startTransition(async () => {
                        const result = await createTodayRepairSession(paperId);
                        if (result.success && result.sessionId && result.paperId) {
                            router.push(`/repair/${result.paperId}?sessionId=${result.sessionId}`);
                            return;
                        }
                        setError(result.error ?? "Unable to start repair.");
                    });
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                {isPending ? "Preparing…" : label}
            </button>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
        </div>
    );
}
