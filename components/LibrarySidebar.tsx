"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutGrid,
    FileText,
    GraduationCap,
    LayoutDashboard,
    BellRing,
} from "lucide-react";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV = [
    {
        section: "Browse",
        items: [
            { label: "Categories", href: "/library/category", icon: LayoutGrid },
            { label: "Exams", href: "/library/exam", icon: GraduationCap },
            { label: "Papers", href: "/library/paper", icon: FileText },
        ],
    },
    {
        section: "Dashboard",
        items: [
            { label: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Notifications", href: "/library/notifications", icon: BellRing },
            //{ label: "Bookmarks", href: "/dashboard/exams", icon: BookMarked },
        ],
    }
    // {
    //     section: "Study",
    //     items: [
    //         { label: "Practice", href: "/library/practice", icon: BookOpen },
    //     ],
    // },
];

export default function LibrarySidebar({ hasUnreadNotifications = false }: { hasUnreadNotifications?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const pathname = usePathname();

    // Flatten all items for mobile view to show in one row
    const allItems = NAV.flatMap(group => group.items);

    return (
        <TooltipProvider delayDuration={0}>
            {/* DESKTOP SIDEBAR */}
            <aside
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className={cn(
                    "hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    "bg-card/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-800/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]",
                    "rounded-[2rem]",
                    isExpanded ? "w-64 " : "w-[68px]"
                )}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-muted dark:bg-slate-700 rounded-l-full opacity-50" />

                <div className="flex flex-col h-full">
                    <div className="flex-1 py-8 space-y-8 overflow-y-auto no-scrollbar">
                        {NAV.map((group) => (
                            <div key={group.section} className="px-3">
                                <p className={cn(
                                    "text-[10px] font-black text-muted-foreground dark:text-slate-400 uppercase tracking-[0.2em] px-4 mb-4 transition-all duration-200",
                                    isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                                )}>
                                    {group.section}
                                </p>

                                <div className="space-y-2">
                                    {group.items.map((item) => {
                                        const isActive = pathname.startsWith(item.href);
                                        const Icon = item.icon;

                                        return (
                                            <Tooltip key={item.href}>
                                                <TooltipTrigger asChild>
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            "group flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300",
                                                            isActive
                                                                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-lg scale-[1.02]"
                                                                : "text-muted-foreground dark:text-slate-400 hover:bg-card/50 dark:hover:bg-slate-800/50 hover:text-foreground dark:hover:text-slate-100"
                                                        )}
                                                    >
                                                        <Icon size={20} className="shrink-0" />
                                                        <span className={cn(
                                                            "text-[13px] font-bold whitespace-nowrap transition-all duration-300",
                                                            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                                                        )}>
                                                            {item.label}
                                                        </span>
                                                    </Link>
                                                </TooltipTrigger>
                                                {!isExpanded && (
                                                    <TooltipContent side="right" className="bg-slate-900 text-white font-bold text-[10px] uppercase border-none">
                                                        {item.label}
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>


            {/* MOBILE NAVIGATION */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
            <nav className="pointer-events-auto mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/20 bg-card/90 shadow-2xl backdrop-blur-lg dark:border-slate-800/40 dark:bg-slate-900/90">
                <div
                    className="grid h-16 grid-cols-5 items-stretch px-2"
                >
                    {allItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        const mobileLabel =
                            item.label === "My Dashboard"
                                ? "Dashboard"
                                : item.label === "Notifications"
                                    ? "Notifications"
                                    : item.label;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors",
                                    isActive
                                        ? "bg-slate-900 dark:bg-slate-800 text-white shadow-md"
                                        : "text-muted-foreground dark:text-slate-400 hover:bg-muted/50 dark:hover:bg-slate-800/50"
                                )}
                            >
                                <span className="relative"><Icon size={19} className="shrink-0" />{item.label === "Notifications" && hasUnreadNotifications && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary ring-2 ring-card" aria-label="Unread notifications" />}</span>
                                <span className="w-full truncate text-center text-[9px] font-bold leading-none">
                                    {mobileLabel}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
            </div>
        </TooltipProvider>
    );
}
