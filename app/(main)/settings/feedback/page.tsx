import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { APP_FEEDBACK_CATEGORY_LABELS } from "@/lib/feedback/schemas";

export default async function MyFeedbackPage() {
    const user = await requireAuth();
    const feedback = await prisma.appFeedback.findMany({
        where: { reporterId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    return (
        <main className="mx-auto max-w-4xl px-4 py-10 pb-32 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Your feedback</p>
                    <h1 className="mt-2 text-3xl font-black">App feedback history</h1>
                </div>
                <Link href="/feedback" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Send feedback</Link>
            </div>
            <div className="mt-7 space-y-3">
                {feedback.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">You have not submitted app feedback yet.</div>
                ) : feedback.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            <span>{APP_FEEDBACK_CATEGORY_LABELS[item.category]}</span><span>•</span><span>{item.status.replace("_", " ")}</span>
                        </div>
                        <h2 className="mt-2 font-black">{item.title}</h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">{item.message}</p>
                        {item.adminResponse && <p className="mt-4 rounded-xl bg-muted p-3 text-sm"><strong>Team response:</strong> {item.adminResponse}</p>}
                    </article>
                ))}
            </div>
        </main>
    );
}
