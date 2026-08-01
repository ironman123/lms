"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    createExamSession,
    resumeExamSession,
} from "@/app/(main)/actions/session-actions";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMode } from "@prisma/client";

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

    const handleStart = async () => {
        setError(null);
        startTransition(async () => {
            if (resumeSessionId) {
                const result = await resumeExamSession(resumeSessionId);
                if (
                    result.success &&
                    result.paperId &&
                    result.mode &&
                    result.sessionId
                ) {
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
            if (result.success) {
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

