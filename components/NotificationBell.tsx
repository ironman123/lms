"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationsSeen } from "@/app/(main)/actions/notification-actions";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Notification {
    id: string;
    title: string;
    body: string;
    url: string | null;
    type: string;
    createdAt: Date;
    examId: string | null;
}

interface Props {
    notifications: Notification[];
    // ISO string from Redis — null means user has never opened the bell
    seenAt: string | null;
}

function timeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
    EXAM_DATE: "bg-blue-100 text-blue-700",
    NEW_MOCK: "bg-green-100 text-green-700",
    RESULT: "bg-purple-100 text-purple-700",
    GENERAL: "bg-muted text-muted-foreground",
};

export default function NotificationBell({ notifications, seenAt }: Props) {
    const [open, setOpen] = useState(false);
    const [localSeenAt, setLocalSeenAt] = useState(seenAt);
    const [, startTransition] = useTransition();

    // A dot shows if any notification is newer than the last-seen timestamp
    const hasUnread = notifications.some(
        (n) => !localSeenAt || new Date(n.createdAt) > new Date(localSeenAt)
    );

    const handleOpen = () => {
        setOpen((v) => !v);
        if (!open && hasUnread)
        {
            const now = new Date().toISOString();
            setLocalSeenAt(now);
            startTransition(() => {
                markNotificationsSeen();
            });
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
                aria-label="Notifications"
            >
                <Bell size={18} className="text-muted-foreground" />
                {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-2xl border border-border shadow-xl z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                            <h3 className="text-sm font-black text-foreground">Notifications</h3>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {notifications.length} recent
                            </span>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-muted-foreground">No notifications yet.</p>
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const isNew =
                                        !localSeenAt ||
                                        new Date(n.createdAt) > new Date(localSeenAt);
                                    const content = (
                                        <div
                                            className={cn(
                                                "px-4 py-3 border-b border-slate-50 hover:bg-background transition-colors",
                                                isNew && "bg-blue-50/40"
                                            )}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                {isNew && (
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                )}
                                                <div className={cn("flex-1 min-w-0", !isNew && "pl-4")}>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-sm font-bold text-foreground truncate">
                                                            {n.title}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0",
                                                                TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL
                                                            )}
                                                        >
                                                            {n.type.replace("_", " ")}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                        {n.body}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {timeAgo(n.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    return n.url ? (
                                        <Link key={n.id} href={n.url}>
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={n.id}>{content}</div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}