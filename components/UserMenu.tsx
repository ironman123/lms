// components/UserMenu.tsx
"use client";

import { useState } from "react";
import { LogOut, User, Settings, ChevronDown, SlidersHorizontal, ShieldCheck, MessageSquareWarning, MessageSquarePlus } from "lucide-react";
import { signOut } from "@/app/actions/auth-actions";
import Link from "next/link";
import Image from "next/image";

interface Props {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
    moderationAttentionCount?: number;
}

export default function UserMenu({ name, email, avatarUrl, role, moderationAttentionCount = 0 }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted dark:hover:bg-slate-800 sm:px-2"
            >
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={name ?? "User"}
                        width={32}
                        height={32}
                        unoptimized
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                        {(name ?? email)[0].toUpperCase()}
                    </div>
                )}
                <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-foreground dark:text-slate-100 leading-none">{name ?? "User"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{role}</p>
                </div>
                <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card dark:bg-slate-900 rounded-2xl border border-border dark:border-slate-800 shadow-xl z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border/60 dark:border-slate-800">
                            <p className="text-sm font-bold text-foreground dark:text-slate-100 truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{email}</p>
                        </div>

                        <div className="p-1.5">

                            <Link href="/dashboard"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"                             >
                                <User size={15} className="text-muted-foreground" />
                                Dashboard
                            </Link>

                            <Link
                                href="/settings"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                            >
                                <SlidersHorizontal size={15} className="text-muted-foreground" />
                                Settings
                            </Link>
                            <Link
                                href="/settings/reports"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                            >
                                <MessageSquareWarning size={15} className="text-muted-foreground" />
                                My reports
                            </Link>
                            <Link
                                href="/feedback"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                            >
                                <MessageSquarePlus size={15} className="text-muted-foreground" />
                                Send app feedback
                            </Link>
                            <Link
                                href="/settings/feedback"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                            >
                                <MessageSquareWarning size={15} className="text-muted-foreground" />
                                My app feedback
                            </Link>

                            {role === "ADMIN" && (
                                <>
                                    <Link href="/admin/moderation"
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                                    >
                                        <ShieldCheck size={15} className="text-muted-foreground" />
                                        Moderation
                                        {moderationAttentionCount > 0 && (
                                            <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-black text-destructive-foreground">
                                                {moderationAttentionCount > 99
                                                    ? "99+"
                                                    : moderationAttentionCount}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/library"
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 dark:text-slate-200 hover:bg-background dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                                    >
                                        <Settings size={15} className="text-muted-foreground" />
                                        Admin Library
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="p-1.5 border-t border-border/60 dark:border-slate-800">
                            <form action={signOut}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors font-bold"
                                >
                                    <LogOut size={15} />
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
}
