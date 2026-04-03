"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, useEffect, useState, useRef } from "react";
import { Loader2, Search } from "lucide-react";

export default function SearchFilter({ value }: { value: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    // 1. Local state for the input
    const [localValue, setLocalValue] = useState(value);

    // 2. Sync local state ONLY when the prop 'value' changes from the OUTSIDE
    // (e.g., when you click a "Clear" link or go back in history)
    useEffect(() => {
        if (value !== localValue)
        {
            setLocalValue(value);
        }
    }, [value]);

    // 3. Debounced URL Update
    useEffect(() => {
        const timer = setTimeout(() => {
            // Don't update the URL if the local typing matches what's already in the URL
            if (localValue === value) return;

            startTransition(() => {
                const params = new URLSearchParams(window.location.search);
                if (localValue)
                {
                    params.set("q", localValue);
                } else
                {
                    params.delete("q");
                }
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            });
        }, 200);

        return () => clearTimeout(timer);
    }, [localValue, value, pathname, router]);

    return (
        <div className="relative mb-3 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className={isPending ? "text-blue-600" : "text-slate-400"} />
            </div>
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="Search..."
                className="block w-full h-12 pl-10 pr-12 py-3 border rounded-xl border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/70 transition-all"
            />

            {isPending && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
            )}
        </div>
    );
}