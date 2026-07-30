"use client";
import { useEffect, useRef, useState } from "react";

export default function SessionTimer({
    expiresAt,
    onExpire,
}: {
    expiresAt: string;
    onExpire: () => void;
}) {
    const [remaining, setRemaining] = useState(0);
    const onExpireRef = useRef(onExpire);
    const expiredRef = useRef(false);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        const calculateRemaining = () =>
            Math.max(
                0,
                Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
            );

        expiredRef.current = false;
        const updateRemaining = () => {
            const nextRemaining = calculateRemaining();
            setRemaining(nextRemaining);
            if (nextRemaining <= 0 && !expiredRef.current) {
                expiredRef.current = true;
                onExpireRef.current();
            }
            return nextRemaining;
        };

        updateRemaining();
        const interval = setInterval(() => {
            if (updateRemaining() <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

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
