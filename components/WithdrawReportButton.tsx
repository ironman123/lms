"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { withdrawMyContentReport } from "@/app/(main)/actions/moderation-actions";

export default function WithdrawReportButton({
    reportId,
}: {
    reportId: string;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() =>
                startTransition(async () => {
                    const result = await withdrawMyContentReport(reportId);
                    if (!result.success) {
                        toast.error(result.error);
                        return;
                    }
                    toast.success("Report withdrawn.");
                    router.refresh();
                })
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive disabled:opacity-60"
        >
            <Undo2 size={14} />
            {pending ? "Withdrawing…" : "Withdraw"}
        </button>
    );
}
