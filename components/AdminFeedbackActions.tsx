"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateAppFeedback } from "@/app/(main)/actions/feedback-actions";

export default function AdminFeedbackActions({
    feedback,
    assignees,
}: {
    feedback: {
        id: string;
        status: "NEW" | "IN_REVIEW" | "PLANNED" | "RESOLVED" | "CLOSED";
        priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
        assignedToId: string | null;
        adminResponse: string | null;
    };
    assignees: Array<{ id: string; name: string | null; email: string }>;
}) {
    const [status, setStatus] = useState(feedback.status);
    const [priority, setPriority] = useState(feedback.priority);
    const [assignedToId, setAssignedToId] = useState(feedback.assignedToId ?? "");
    const [adminResponse, setAdminResponse] = useState(feedback.adminResponse ?? "");
    const [pending, startTransition] = useTransition();

    return (
        <div className="grid gap-3 border-t border-border bg-muted/20 p-4 md:grid-cols-3">
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-bold">
                {['NEW','IN_REVIEW','PLANNED','RESOLVED','CLOSED'].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-bold">
                {['LOW','NORMAL','HIGH','URGENT'].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-bold">
                <option value="">Unassigned</option>
                {assignees.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
            </select>
            <textarea value={adminResponse} onChange={(event) => setAdminResponse(event.target.value)} placeholder="Response visible to the user" rows={3} className="rounded-lg border border-border bg-background p-3 text-xs md:col-span-2" />
            <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => {
                    const result = await updateAppFeedback({ feedbackId: feedback.id, status, priority, assignedToId: assignedToId || null, adminResponse: adminResponse || null });
                    if (result.success) toast.success("Feedback updated");
                    else toast.error(result.error);
                })}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-60"
            >
                {pending && <Loader2 size={14} className="animate-spin" />} Save ticket
            </button>
        </div>
    );
}
