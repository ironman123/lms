import { AppFeedbackStatus } from "@prisma/client";
import AdminFeedbackActions from "@/components/AdminFeedbackActions";
import { APP_FEEDBACK_CATEGORY_LABELS } from "@/lib/feedback/schemas";
import prisma from "@/lib/prisma";

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const params = await searchParams;
    const status = Object.values(AppFeedbackStatus).includes(params.status as AppFeedbackStatus)
        ? params.status as AppFeedbackStatus
        : undefined;
    const [feedback, assignees] = await Promise.all([
        prisma.appFeedback.findMany({
            where: status ? { status } : {},
            include: { reporter: { select: { name: true, email: true } } },
            orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
            take: 100,
        }),
        prisma.user.findMany({
            where: { role: { in: ["ADMIN", "CREATOR"] } },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        }),
    ]);
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Product operations</p>
            <h2 className="mt-2 text-3xl font-black">App feedback</h2>
            <p className="mt-2 text-sm text-muted-foreground">Bugs, UX problems, performance complaints, accessibility issues, and feature requests.</p>
            <div className="mt-6 flex flex-wrap gap-2">
                {["ALL", ...Object.values(AppFeedbackStatus)].map((value) => (
                    <a key={value} href={value === "ALL" ? "/admin/feedback" : `/admin/feedback?status=${value}`} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold">{value.replace("_", " ")}</a>
                ))}
            </div>
            <div className="mt-6 space-y-4">
                {feedback.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No feedback tickets match this filter.</div> : feedback.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="p-5">
                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <span>{APP_FEEDBACK_CATEGORY_LABELS[item.category]}</span><span>•</span><span>{item.priority}</span><span>•</span><span>{item.reporter.name ?? item.reporter.email}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-black">{item.title}</h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">{item.message}</p>
                            {item.pageUrl && <p className="mt-3 break-all text-xs text-muted-foreground">Page: {item.pageUrl}</p>}
                        </div>
                        <AdminFeedbackActions feedback={{ id: item.id, status: item.status, priority: item.priority, assignedToId: item.assignedToId, adminResponse: item.adminResponse }} assignees={assignees} />
                    </article>
                ))}
            </div>
        </main>
    );
}
