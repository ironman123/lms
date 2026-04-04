"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createExamSession } from "@/app/(main)/actions/session-actions"; // The action we created earlier
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMode } from "@prisma/client";

interface StartButtonProps {
    examId: string;
    paperId: string;
    mode: SessionMode
    label: string;
    variant?: "default" | "outline";
}

export default function StartExamButton({ examId, paperId, mode, label, variant = "default" }: StartButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleStart = async () => {
        startTransition(async () => {
            const result = await createExamSession(paperId, mode);
            if (result.success)
            {
                router.push(`/exam/${paperId}/${mode.toLowerCase()}?sessionId=${result.sessionId}`);
            }
        });
    };

    return (
        <Button
            onClick={handleStart}
            disabled={isPending}
            variant={variant}
            className={cn(
                "flex-1 h-16 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95",
                variant === "default" && "bg-slate-900 text-white hover:bg-slate-800 shadow-2xl",
                variant === "outline" && "border-2 border-slate-200 hover:bg-slate-50 text-slate-900"
            )}
        >
            {isPending ? (
                <>
                    <Loader2 className="animate-spin h-6 w-6 mr-2" />
                    Starting {mode.toLowerCase()}...
                </>
            ) : (
                label
            )}
        </ Button >
    );
};

