// components/SendNotificationForm.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { sendNotification } from "@/app/(main)/actions/notification-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
    { value: "GENERAL", label: "General", desc: "Platform-wide announcement" },
    { value: "NEW_MOCK", label: "New Mock", desc: "New paper available" },
    { value: "EXAM_DATE", label: "Exam Date", desc: "Date or schedule update" },
    { value: "RESULT", label: "Result", desc: "Result announced" },
] as const;

interface Exam { id: string; name: string; }

export default function SendNotificationForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [exams, setExams] = useState<Exam[]>([]);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("");
    const [examId, setExamId] = useState("");
    const [type, setType] = useState<typeof TYPES[number]["value"]>("GENERAL");

    useEffect(() => {
        fetch("/api/admin/exams")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data))
                {
                    setExams(data);
                } else if (data && data.exams && Array.isArray(data.exams))
                {
                    setExams(data.exams);
                } else
                {
                    console.error("Expected an array of exams, but got:", data);
                    setExams([]);
                    toast.error("Received unexpected data format from the server.");
                }
            })
            .catch(() => toast.error("Failed to load exams."));
    }, []);

    const handleSend = () => {
        if (!title.trim()) { toast.error("Title is required."); return; }
        if (!body.trim()) { toast.error("Body is required."); return; }

        startTransition(async () => {
            const result = await sendNotification({
                title,
                body,
                url: url || undefined,
                examId: examId || undefined,
                type,
            });

            if (result.success)
            {
                toast.success("Notification queued for delivery.");
                router.push("/library/notifications");
            } else
            {
                toast.error("Failed to send notification.");
            }
        });
    };

    return (
        <div className="space-y-5">
            {/* Type */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Type</h2>
                <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setType(t.value)}
                            className={cn(
                                "p-3 rounded-xl border-2 text-sm font-bold transition-all text-left",
                                type === t.value
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                            )}
                        >
                            {t.label}
                            <p className={cn(
                                "text-[10px] font-normal mt-0.5",
                                type === t.value ? "text-slate-300" : "text-slate-400"
                            )}>
                                {t.desc}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Content</h2>

                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. New KPSC mock test available"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors"
                    />
                </div>

                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Body</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="The full notification message..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors resize-none"
                    />
                </div>

                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Link URL <span className="normal-case font-normal text-slate-400">— optional, deep link on click</span>
                    </label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="/library/exam/kpsc-assistant"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors"
                    />
                </div>
            </div>

            {/* Targeting */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                <div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Target Audience</h2>
                    <p className="text-xs text-slate-400 mt-1">Leave blank to broadcast to all subscribers.</p>
                </div>
                <select
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-900 transition-colors bg-white"
                >
                    <option value="">All subscribers (broadcast)</option>
                    {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} — subscribers only</option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleSend}
                disabled={isPending}
                className="w-full h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
                {isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending...</>
                ) : (
                    "Send Notification"
                )}
            </button>
        </div>
    );
}