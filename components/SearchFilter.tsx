"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition } from "react";

export default function SearchFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term)
        {
            params.set("q", term);
        } else
        {
            params.delete("q");
        }

        // startTransition keeps the UI responsive while the server fetches new data
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    return (
        <div className="relative mb-8 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className={`text-slate-400 ${isPending ? "animate-pulse" : ""}`} />
            </div>
            <input
                type="text"
                placeholder="Search exams by name or description..."
                defaultValue={searchParams.get("q")?.toString()}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
        </div>
    );
}