// app/(main)/library/notifications/page.tsx
import prisma from "@/lib/prisma";
import { getOptionalUser } from "@/lib/auth";
import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
    EXAM_DATE: "bg-blue-100 text-blue-700",
    NEW_MOCK: "bg-green-100 text-green-700",
    RESULT: "bg-purple-100 text-purple-700",
    GENERAL: "bg-muted text-muted-foreground",
};

function timeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default async function NotificationsPage() {
    const user = await getOptionalUser();
    const isAdmin = user?.role === "ADMIN";

    const notifications = await prisma.notification.findMany({
        where: { sentAt: { not: null } },
        include: {
            exam: { select: { name: true, slug: true } },
            _count: { select: { logs: { where: { delivered: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">
                            Notifications
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isAdmin ? "All sent notifications." : "Recent platform updates."}
                        </p>
                    </div>
                    {isAdmin && (
                        <Link
                            href="/library/notifications/new"
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            <Plus size={15} /> Send
                        </Link>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card">
                        <Bell size={36} className="mx-auto text-slate-200 mb-3" />
                        <p className="font-bold text-muted-foreground">No notifications sent yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className="bg-card rounded-2xl border border-border px-5 py-4 flex items-start gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <p className="text-sm font-bold text-foreground">{n.title}</p>
                                        <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md", TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL)}>
                                            {n.type.replace("_", " ")}
                                        </span>
                                        {n.exam && (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                {n.exam.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                        <span>{timeAgo(n.createdAt)}</span>
                                        {isAdmin && <span>{n._count.logs} delivered</span>}
                                        {n.url && (
                                            <Link href={n.url} className="text-blue-500 hover:underline">
                                                View →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}