"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createExamSession } from "@/app/(main)/actions/session"; // The action we created earlier
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartButtonProps {
    examId: string;
    paperId: string;
    mode: "PRACTICE" | "MOCK_EXAM";
    label: string;
    variant?: "default" | "outline";
}

export default function StartExamButton({ examId, paperId, mode, label, variant = "default" }: StartButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleStart = async () => {
        setIsLoading(true);
        const result = await createExamSession(paperId, mode);

        if (result.success && result.sessionId)
        {
            const routeMode = mode === 'PRACTICE' ? 'practice' : 'mock';
            // Route them to the session page, appending the secure sessionId
            router.push(`/exam/${examId}/paper/${paperId}/${routeMode}?sessionId=${result.sessionId}`);
        } else
        {
            alert("Failed to initialize session.");
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleStart}
            disabled={isLoading}
            variant={variant}
            className={cn(
                "flex-1 h-16 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95",
                variant === "default" && "bg-slate-900 text-white hover:bg-slate-800 shadow-2xl",
                variant === "outline" && "border-2 border-slate-200 hover:bg-slate-50 text-slate-900"
            )}
        >
            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : label}
        </Button>
    );
}