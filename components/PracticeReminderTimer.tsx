"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import {
    clearPracticeReminder,
    getPracticeReminderDeadline,
} from "@/lib/practice-reminder";

function remainingSeconds(deadline: number) {
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
}

export default function PracticeReminderTimer({ sessionId }: { sessionId: string }) {
    const [deadline, setDeadline] = useState<number | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const stored = getPracticeReminderDeadline(sessionId);
            setDeadline(stored);
            setRemaining(stored ? remainingSeconds(stored) : null);
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [sessionId]);

    useEffect(() => {
        if (!deadline) return;
        const update = () => {
            const next = remainingSeconds(deadline);
            setRemaining(next);
            if (next === 0) {
                clearPracticeReminder(sessionId);
                toast.info("Your practice time goal has ended.", {
                    description:
                        "You can keep practising—nothing was submitted or changed.",
                    duration: 10_000,
                });
                setDeadline(null);
            }
        };
        update();
        const interval = window.setInterval(update, 1_000);
        return () => window.clearInterval(interval);
    }, [deadline, sessionId]);

    if (remaining === null || remaining <= 0) return null;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return (
        <div
            className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/25 bg-card/95 px-4 text-xs font-black text-foreground shadow-lg backdrop-blur"
            aria-label={`Practice reminder: ${minutes} minutes ${seconds} seconds remaining`}
        >
            <BellRing size={14} className="text-primary" />
            {minutes}:{String(seconds).padStart(2, "0")}
        </div>
    );
}
