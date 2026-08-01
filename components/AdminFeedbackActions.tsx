"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
    acknowledgeAppFeedback,
    updateAppFeedback,
} from "@/app/(main)/actions/feedback-actions";
import {
    APP_FEEDBACK_STATUSES,
    APP_FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback/schemas";

export default function AdminFeedbackActions({
    feedback,
    assignees,
}: {
    feedback: {
        id: string;
        status:
            | "NEW"
            | "ACKNOWLEDGED"
            | "IN_REVIEW"
            | "PLANNED"
            | "RESOLVED"
            | "CLOSED";
        priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
        assignedToId: string | null;
        adminResponse: string | null;
    };
    assignees: Array<{ id: string; name: string | null; email: string }>;
}) {
    const [status, setStatus] = useState(feedback.status);
    const [priority, setPriority] = useState(feedback.priority);
    const [assignedToId, setAssignedToId] = useState(
        feedback.assignedToId ?? ""
    );
    const [adminResponse, setAdminResponse] = useState(
        feedback.adminResponse ?? ""
    );
    const [pending, startTransition] = useTransition();

    function acknowledge() {
        startTransition(async () => {
            const result = await acknowledgeAppFeedback({
                feedbackId: feedback.id,
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setStatus("ACKNOWLEDGED");
            toast.success(
                result.alreadyAcknowledged
                    ? "Feedback was already acknowledged"
                    : "Feedback acknowledged"
            );
        });
    }

    function save() {
        startTransition(async () => {
            const result = await updateAppFeedback({
                feedbackId: feedback.id,
                status,
                priority,
                assignedToId: assignedToId || null,
                adminResponse: adminResponse || null,
            });
            if (result.success) toast.success("Feedback updated");
            else toast.error(result.error);
        });
    }

    const fieldClass =
        "mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/25";

    return (
        <section className="border-t border-border bg-muted/20 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Status
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as typeof status)
                        }
                        className={fieldClass}
                    >
                        {APP_FEEDBACK_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {APP_FEEDBACK_STATUS_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Priority
                    <select
                        value={priority}
                        onChange={(event) =>
                            setPriority(event.target.value as typeof priority)
                        }
                        className={fieldClass}
                    >
                        {["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                </label>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:col-span-2 lg:col-span-1">
                    Assigned to
                    <select
                        value={assignedToId}
                        onChange={(event) =>
                            setAssignedToId(event.target.value)
                        }
                        className={fieldClass}
                    >
                        <option value="">Unassigned</option>
                        {assignees.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name ?? user.email}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Response visible to the student
                <textarea
                    value={adminResponse}
                    onChange={(event) =>
                        setAdminResponse(event.target.value)
                    }
                    placeholder="Explain what the team found, decided, or changed."
                    rows={4}
                    className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm font-medium normal-case leading-relaxed tracking-normal text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
                />
            </label>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {status === "NEW" && (
                    <button
                        type="button"
                        disabled={pending}
                        onClick={acknowledge}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 text-sm font-black text-success disabled:opacity-60"
                    >
                        {pending ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCheck size={16} />
                        )}
                        Acknowledge
                    </button>
                )}
                <button
                    type="button"
                    disabled={pending}
                    onClick={save}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-60"
                >
                    {pending ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Save size={16} />
                    )}
                    Save changes
                </button>
            </div>
        </section>
    );
}
