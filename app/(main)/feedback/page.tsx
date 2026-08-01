import AppFeedbackForm from "@/components/AppFeedbackForm";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { History } from "lucide-react";

export default async function FeedbackPage() {
    await requireAuth();
    return (
        <main className="mx-auto max-w-3xl px-4 py-10 pb-32 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Help improve the app</p>
                    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Feedback & support</h1>
                </div>
                <Link
                    href="/settings/feedback"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
                >
                    <History size={16} />
                    My feedback
                </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Use content reports for a wrong question or paper. Use this form for bugs, slow pages, confusing screens, accessibility problems, and feature ideas.
            </p>
            <div className="mt-8"><AppFeedbackForm /></div>
        </main>
    );
}
