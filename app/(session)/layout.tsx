// app/library/exam/[id]/paper/[paperId]/(session)/layout.tsx

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export default function ExamLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { id: string; paperId: string };
}) {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* STICKY EXAM HEADER */}
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/library/exam/${params.id}/paper/${params.paperId}`}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </Link>
                    <div className="h-6 w-px bg-slate-200" />
                    <h2 className="font-black text-slate-900 tracking-tight text-sm uppercase">
                        Active Session
                    </h2>
                </div>

                {/* This is where we will eventually plug in a Client Timer component */}
                <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full font-mono font-bold text-sm">
                        00:00:00
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden">
                {children}
            </div>
        </div>
    );
}