// components/UserMenu.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { signOut } from "@/app/actions/auth-actions";

interface Props {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
}

export default function UserMenu({ name, email, avatarUrl, role }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={name ?? "User"}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                        {(name ?? email)[0].toUpperCase()}
                    </div>
                )}
                <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{name ?? "User"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{role}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden md:block" />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                            <p className="text-xs text-slate-400 truncate">{email}</p>
                        </div>

                        <div className="p-1.5">

                            <a href="/dashboard"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"                             >
                                <User size={15} className="text-slate-400" />
                                Dashboard
                            </a>

                            {role === "ADMIN" && (

                                <a href="/library"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                                >
                                    <Settings size={15} className="text-slate-400" />
                                    Admin Library
                                </a>
                            )}
                        </div>

                        <div className="p-1.5 border-t border-slate-100">
                            <form action={signOut}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold"
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