"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutGrid, BookOpen, FileText, ChevronLeft, ChevronRight,
    GraduationCap,
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
    // {
    //     section: "Study",
    //     items: [
    //         { label: "Practice", href: "/library/practice", icon: BookOpen },
    //     ],
    // },
];

export default function LibrarySidebar() {
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
                    "hidden md:flex fixed left-4 top-50 z-40 flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    "bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]",
                    "rounded-[2rem]",
                    isExpanded ? "w-64 " : "w-[68px]"
                )}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-200 rounded-l-full opacity-50" />

                <div className="flex flex-col h-full">
                    <div className="flex-1 py-8 space-y-8 overflow-y-auto no-scrollbar">
                        {NAV.map((group) => (
                            <div key={group.section} className="px-3">
                                <p className={cn(
                                    "text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-4 transition-all duration-200",
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
                                                                ? "bg-slate-900 text-white shadow-lg scale-[1.02]"
                                                                : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
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
            <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-white/80 backdrop-blur-lg border border-white/20 shadow-2xl rounded-[2rem] overflow-hidden">
                <div
                    className="flex items-center justify-start h-16 px-4 gap-2 overflow-x-auto flex-nowrap no-scrollbar touch-pan-x"
                    style={{
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch' // Smooth momentum scrolling for iOS
                    }}
                >
                    {/* Custom CSS to hide scrollbar */}
                    <style jsx>{`
            div::-webkit-scrollbar {
                display: none;
            }
        `}</style>

                    {allItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300",
                                    isActive
                                        ? "bg-slate-900 text-white shadow-md"
                                        : "text-slate-400 hover:bg-slate-100/50"
                                )}
                            >
                                <Icon size={20} className="shrink-0" />
                                {isActive && (
                                    <span className="text-[13px] font-bold whitespace-nowrap">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </TooltipProvider>
    );
}