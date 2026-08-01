"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    createExamSession,
    resumeExamSession,
} from "@/app/(main)/actions/session-actions";
import { BellRing, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMode } from "@prisma/client";
import {
    MAX_PRACTICE_REMINDER_MINUTES,
    normalizePracticeReminderMinutes,
    setPracticeReminder,
} from "@/lib/practice-reminder";

interface StartButtonProps {
    paperId: string;
    mode: SessionMode
    label: string;
    variant?: "default" | "outline";
    resumeSessionId?: string;
    disabledReason?: string | null;
    examId?: string | null;
}

export default function StartExamButton({
    paperId,
    mode,
    label,
    variant = "default",
    resumeSessionId,
    disabledReason,
    examId,
}: StartButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [reminderMinutes, setReminderMinutes] = useState("");

    const readReminderMinutes = () => {
        if (mode !== SessionMode.PRACTICE) return null;
        try {
            return normalizePracticeReminderMinutes(reminderMinutes);
        } catch (validationError) {
            setError(
                validationError instanceof Error
                    ? validationError.message
                    : "Practice reminder is invalid."
            );
            return undefined;
        }
    };

    const handleStart = async () => {
        setError(null);
        const practiceReminderMinutes = readReminderMinutes();
        if (practiceReminderMinutes === undefined) return;
        startTransition(async () => {
            if (resumeSessionId) {
                const result = await resumeExamSession(resumeSessionId);
                if (
                    result.success &&
                    result.paperId &&
                    result.mode &&
                    result.sessionId
                ) {
                    if (practiceReminderMinutes !== null) {
                        setPracticeReminder(result.sessionId, practiceReminderMinutes);
                    }
                    router.push(
                        `/exam/${result.paperId}/${result.mode.toLowerCase()}?sessionId=${result.sessionId}`
                    );
                } else {
                    setError(
                        result.error ?? "Unable to resume this session."
                    );
                }
                return;
            }

            const result = await createExamSession(paperId, mode, examId);
            if (result.success && result.sessionId) {
                if (practiceReminderMinutes !== null) {
                    setPracticeReminder(result.sessionId, practiceReminderMinutes);
                }
                router.push(
                    `/exam/${paperId}/${mode.toLowerCase()}?sessionId=${result.sessionId}`
                );
            } else if (
                result.error === "PAYMENT_REQUIRED" &&
                "bundleId" in result &&
                result.bundleId
            ) {
                router.push(`/subscription?bundleId=${result.bundleId}`);
            } else {
                setError(result.error ?? "Unable to start this session.");
            }
        });
    };

    return (
        <div className="flex flex-1 flex-col gap-2">
            {mode === SessionMode.PRACTICE && (
                <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground">
                    <BellRing size={15} className="shrink-0 text-primary" />
                    <span className="shrink-0">Optional reminder</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_PRACTICE_REMINDER_MINUTES}
                        step={1}
                        value={reminderMinutes}
                        onChange={(event) => setReminderMinutes(event.target.value)}
                        placeholder="Minutes"
                        aria-label="Practice reminder in minutes"
                        className="min-w-0 flex-1 bg-transparent text-right font-black text-foreground outline-none placeholder:text-muted-foreground/70"
                    />
                    <span>min</span>
                </label>
            )}
            <Button
                onClick={handleStart}
                disabled={isPending || Boolean(disabledReason)}
                variant={variant}
                className={cn(
                    "h-16 w-full rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95",
                    variant === "default" && "shadow-sm",
                    variant === "outline" && "border-2 border-border bg-background text-foreground hover:bg-accent"
                )}
            >
                {isPending ? (
                    <>
                        <Loader2 className="animate-spin h-6 w-6 mr-2" />
                        {resumeSessionId ? "Resuming" : "Starting"}{" "}
                        {mode.toLowerCase()}...
                    </>
                ) : (
                    label
                )}
            </Button>
            {disabledReason && (
                <p
                    role="status"
                    className="text-center text-xs font-semibold text-warning"
                >
                    {disabledReason}
                </p>
            )}
            {error && (
                <p role="alert" className="text-center text-xs font-semibold text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};

