import "@/app/(main)/globals.css"; // Ensure Tailwind and fonts are loaded
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

// export default async function ExamLayout({
//     children,
//     params,
// }: {
//     children: React.ReactNode;
//     params: Promise<{ id: string; paperId: string }>;
// }) {
//     // In Next.js 15, params is a Promise in layouts too
//     const { id, paperId } = await params;

//     return (
//         <html lang="en">
//             <body className="bg-white antialiased overflow-hidden">
//                 <div className="min-h-screen bg-white flex flex-col h-screen">

//                     {/* STICKY EXAM HEADER */}
//                     <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50 shrink-0">
//                         <div className="flex items-center gap-4">
//                             <Link
//                                 href={`/library/exam/${id}/paper/${paperId}`}
//                                 className="p-2 hover:bg-slate-100 rounded-full transition-colors"
//                             >
//                                 <X size={20} className="text-slate-400" />
//                             </Link>
//                             <div className="h-6 w-px bg-slate-200" />
//                             <h2 className="font-black text-slate-900 tracking-tight text-sm uppercase">
//                                 Active Session
//                             </h2>
//                         </div>

//                         {/* Placeholder for Timer */}
//                         <div className="flex items-center gap-3">
//                             <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full font-mono font-bold text-sm shadow-lg shadow-slate-200">
//                                 00:00:00
//                             </div>
//                         </div>
//                     </header>

//                     {/* MAIN CONTENT AREA 
//                         Added 'pb-6' for that bottom breathing room.
//                         'overflow-hidden' on parent + 'overflow-y-auto' on children 
//                         is the industry standard for fixed-height app layouts.
//                     */}
//                     <div className="flex-1 flex overflow-hidden pb-4 md:pb-6">
//                         {children}
//                     </div>
//                 </div>
//             </body>
//         </html>
//     );
// }


export default function SessionLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="antialiased">
                <div className="min-h-screen bg-white flex flex-col">
                    {children}
                </div>
            </body>
        </html>
    );
}