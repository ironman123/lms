import AppFeedbackForm from "@/components/AppFeedbackForm";
import { requireAuth } from "@/lib/auth";

export default async function FeedbackPage() {
    await requireAuth();
    return (
        <main className="mx-auto max-w-3xl px-4 py-10 pb-32 sm:px-6 sm:py-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Help improve the app</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Send feedback</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Use content reports for a wrong question or paper. Use this form for bugs, slow pages, confusing screens, accessibility problems, and feature ideas.
            </p>
            <div className="mt-8"><AppFeedbackForm /></div>
        </main>
    );
}
