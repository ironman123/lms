"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

export default function SearchFilter({ value }: { value: string }) {
    return <SearchFilterInput key={value} value={value} />;
}

function SearchFilterInput({ value }: { value: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [localValue, setLocalValue] = useState(value);

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
                params.delete("page");
                const search = params.toString();
                router.replace(search ? `${pathname}?${search}` : pathname, {
                    scroll: false,
                });
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [localValue, value, pathname, router]);

    return (
        <div className="relative mb-3 max-w-md w-full" aria-busy={isPending}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className={isPending ? "text-blue-600" : "text-muted-foreground"} />
            </div>
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="Search..."
                aria-label="Search exams, papers, or categories"
                className="block w-full h-12 pl-10 pr-12 py-3 border rounded-xl border-border bg-card focus:outline-none focus:ring-2 focus:ring-blue-700/70 transition-all"
            />

            {isPending && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
            )}
            <p className="sr-only" aria-live="polite">{isPending ? "Updating search results" : ""}</p>
        </div>
    );
}
