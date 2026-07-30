"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, SearchCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { changeModerationCaseStatus } from "@/app/(main)/actions/moderation-actions";
import { cn } from "@/lib/utils";

type CaseStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export default function ModerationCaseActions({
    caseId,
    status,
}: {
    caseId: string;
    status: CaseStatus;
}) {
    const router = useRouter();
    const [note, setNote] = useState("");
    const [pending, startTransition] = useTransition();

    const changeStatus = (nextStatus: CaseStatus) => {
        if (
            (nextStatus === "RESOLVED" || nextStatus === "DISMISSED") &&
            !note.trim()
        ) {
            toast.error("Add a reason before closing this case.");
            return;
        }
        startTransition(async () => {
            const result = await changeModerationCaseStatus({
                caseId,
                status: nextStatus,
                note,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success(`Case marked ${nextStatus.toLowerCase().replace("_", " ")}.`);
            setNote("");
            router.refresh();
        });
    };

    const terminal = status === "RESOLVED" || status === "DISMISSED";

    return (
        <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-black uppercase tracking-wider">
                Case actions
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Resolution and dismissal reasons are retained in the permanent
                audit trail.
            </p>

            <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={pending}
                rows={3}
                maxLength={5_000}
                placeholder={
                    terminal
                        ? "Optional note for reopening…"
                        : "Required when resolving or dismissing…"
                }
                className="mt-4 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {terminal ? (
                    <ActionButton
                        onClick={() => changeStatus("OPEN")}
                        disabled={pending}
                        icon={RotateCcw}
                        label="Reopen case"
                        className="sm:col-span-2"
                    />
                ) : (
                    <>
                        {status !== "IN_REVIEW" && (
                            <ActionButton
                                onClick={() => changeStatus("IN_REVIEW")}
                                disabled={pending}
                                icon={SearchCheck}
                                label="Take into review"
                            />
                        )}
                        <ActionButton
                            onClick={() => changeStatus("RESOLVED")}
                            disabled={pending}
                            icon={CheckCircle2}
                            label="Resolve as fixed"
                            className="border-success/30 text-success hover:bg-success/10"
                        />
                        <ActionButton
                            onClick={() => changeStatus("DISMISSED")}
                            disabled={pending}
                            icon={XCircle}
                            label="Dismiss report"
                            className={cn(
                                "border-destructive/30 text-destructive hover:bg-destructive/10",
                                status === "IN_REVIEW" && "sm:col-span-2"
                            )}
                        />
                    </>
                )}
            </div>
        </section>
    );
}

function ActionButton({
    icon: Icon,
    label,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: typeof CheckCircle2;
    label: string;
}) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-black transition hover:bg-muted disabled:opacity-60",
                className
            )}
            {...props}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}
