"use client";
import { useEffect, useState } from "react";

export default function SessionTimer({
    durationSeconds,
    startedAt,
}: {
    durationSeconds: number;
    startedAt: string;
}) {
    const [remaining, setRemaining] = useState(durationSeconds);

    useEffect(() => {
        const calculateRemaining = () =>
            Math.max(
                0,
                durationSeconds -
                    Math.floor(
                        (Date.now() - new Date(startedAt).getTime()) / 1000
                    )
            );

        setRemaining(calculateRemaining());
        const interval = setInterval(() => {
            const nextRemaining = calculateRemaining();
            setRemaining(nextRemaining);
            if (nextRemaining <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [durationSeconds, startedAt]);

    const h = Math.floor(remaining / 3600).toString().padStart(2, "0");
    const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, "0");
    const s = (remaining % 60).toString().padStart(2, "0");

    const isWarning = remaining < 300; // last 5 minutes

    return (
        <div
            className={`rounded-xl border px-4 py-2 font-mono text-sm font-bold tabular-nums shadow-sm transition-colors ${
                isWarning
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-card text-foreground"
            }`}
        >
            {h}:{m}:{s}
        </div>
    );
}
