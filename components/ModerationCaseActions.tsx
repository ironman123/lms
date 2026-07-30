"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, SearchCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { changeModerationCaseStatus } from "@/app/(main)/actions/moderation-actions";
import {
    changeModerationCaseAssignment,
    mergeModerationCase,
} from "@/app/(main)/actions/moderation-actions";
import { cn } from "@/lib/utils";

type CaseStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export default function ModerationCaseActions({
    caseId,
    status,
    admins,
    assignedToId,
    mergeCandidates,
}: {
    caseId: string;
    status: CaseStatus;
    admins: Array<{ id: string; name: string | null; email: string }>;
    assignedToId: string | null;
    mergeCandidates: Array<{
        id: string;
        status: CaseStatus;
        uniqueReporterCount: number;
    }>;
}) {
    const router = useRouter();
    const [note, setNote] = useState("");
    const [assigneeId, setAssigneeId] = useState(assignedToId ?? "");
    const [mergeTargetId, setMergeTargetId] = useState("");
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

    const saveAssignment = () => {
        startTransition(async () => {
            const result = await changeModerationCaseAssignment({
                caseId,
                assigneeId: assigneeId || null,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Case assignment updated.");
            router.refresh();
        });
    };

    const merge = () => {
        if (!mergeTargetId) return;
        startTransition(async () => {
            const result = await mergeModerationCase({
                sourceCaseId: caseId,
                targetCaseId: mergeTargetId,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            toast.success("Cases merged.");
            router.push(`/admin/moderation/${result.targetCaseId}`);
            router.refresh();
        });
    };

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

            <div className="mt-5 border-t border-border pt-5">
                <label className="text-xs font-black uppercase tracking-wider">
                    Assigned administrator
                    <select
                        value={assigneeId}
                        onChange={(event) => setAssigneeId(event.target.value)}
                        disabled={pending}
                        className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                    >
                        <option value="">Unassigned</option>
                        {admins.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                                {admin.name ?? admin.email}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={saveAssignment}
                    disabled={pending || assigneeId === (assignedToId ?? "")}
                    className="mt-2 h-10 w-full rounded-xl border border-border text-xs font-black hover:bg-muted disabled:opacity-50"
                >
                    Save assignment
                </button>
            </div>

            {mergeCandidates.length > 0 && (
                <div className="mt-5 border-t border-border pt-5">
                    <label className="text-xs font-black uppercase tracking-wider">
                        Merge duplicate case
                        <select
                            value={mergeTargetId}
                            onChange={(event) =>
                                setMergeTargetId(event.target.value)
                            }
                            disabled={pending}
                            className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                        >
                            <option value="">Select destination…</option>
                            {mergeCandidates.map((candidate) => (
                                <option
                                    key={candidate.id}
                                    value={candidate.id}
                                >
                                    {candidate.status.replace("_", " ")} ·{" "}
                                    {candidate.uniqueReporterCount} reporters
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={merge}
                        disabled={pending || !mergeTargetId}
                        className="mt-2 h-10 w-full rounded-xl border border-warning/30 text-xs font-black text-warning hover:bg-warning/10 disabled:opacity-50"
                    >
                        Merge this case into selected case
                    </button>
                </div>
            )}
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
