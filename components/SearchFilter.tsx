// components/SearchFilter.tsx
"use client";

import { Search } from "lucide-react";

interface SearchFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export default function SearchFilter({ value, onChange }: SearchFilterProps) {
    return (
        <div className="relative mb-8 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search categories by name or description..."
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
        </div>
    );
}