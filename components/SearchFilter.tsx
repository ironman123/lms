"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Loader2, Search } from "lucide-react";

export default function SearchFilter({ value }: { value: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [localValue, setLocalValue] = useState(value);

    // Debounce logic: Wait 300ms after user stops typing to update URL
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue === value) return; // Don't trigger if nothing changed

            startTransition(() => {
                const params = new URLSearchParams();
                if (localValue) params.set("q", localValue);
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            });
        }, 75);

        return () => clearTimeout(timer);
    }, [localValue, pathname, router, value]);

    useEffect(() => {
        // If the defaultValue (from the URL) changes to "", 
        // we must clear our local typing state too.
        setLocalValue(value);
    }, [value]);

    return (
        <div className="relative mb-3 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-600" />
            </div>
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)} // Fast, local update
                placeholder="Search categories by name or description..."
                className={`block w-full h-12 pl-10 pr-3 py-3 border rounded-xl border-slate-200 bg-white leading-5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-700/70 ${isPending ? "opacity-50 cursor-wait" : "opacity-100"}`}
            />
            {isPending && (
                <Loader2 className="absolute right-4 top-3 w-6 h-6 animate-spin text-slate-600" />
            )}
        </div>
    );
}