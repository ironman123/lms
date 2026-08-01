"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { submitAppFeedback } from "@/app/(main)/actions/feedback-actions";
import {
    APP_FEEDBACK_CATEGORIES,
    APP_FEEDBACK_CATEGORY_LABELS,
} from "@/lib/feedback/schemas";

export default function AppFeedbackForm() {
    const [category, setCategory] = useState<(typeof APP_FEEDBACK_CATEGORIES)[number]>("BUG");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [pending, startTransition] = useTransition();

    function submit(event: React.FormEvent) {
        event.preventDefault();
        startTransition(async () => {
            const result = await submitAppFeedback({
                category,
                title,
                message,
                pageUrl: window.location.href,
                context: {
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                    language: navigator.language,
                },
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setTitle("");
            setMessage("");
            toast.success("Thanks — your feedback was sent to the team.");
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div>
                <label htmlFor="feedback-category" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Feedback type
                </label>
                <select
                    id="feedback-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as typeof category)}
                    className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                    {APP_FEEDBACK_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                            {APP_FEEDBACK_CATEGORY_LABELS[value]}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="feedback-title" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Short summary
                </label>
                <input
                    id="feedback-title"
                    required
                    minLength={5}
                    maxLength={120}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What happened, or what should improve?"
                    className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
            </div>
            <div>
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor="feedback-message" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Details
                    </label>
                    <span className="text-[10px] text-muted-foreground">{message.length}/5000</span>
                </div>
                <textarea
                    id="feedback-message"
                    required
                    minLength={10}
                    maxLength={5_000}
                    rows={7}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what you expected, what actually happened, and how to reproduce it."
                    className="mt-2 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
            </div>
            <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {pending ? <Loader2 size={17} className="animate-spin" /> : <MessageSquarePlus size={17} />}
                {pending ? "Sending…" : "Send feedback"}
            </button>
        </form>
    );
}
