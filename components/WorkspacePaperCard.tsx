// components/WorkspacePaperCard.tsx
"use client";
import Link from "next/link";
import { Clock, Bookmark, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

interface WorkspacePaperCardProps {
    id: string | number;
    title: string;
    type: string;
    year?: string;
    pricing: string;
    examId: string;
    examSlug: string;
    subject: string;
    duration: number;
    shift: string;
    color?: string;
    isAdmin?: boolean;
    onDelete?: () => Promise<any>;
}

const WorkspacePaperCard = ({
    id, title, type, year, examSlug, pricing, examId,
    subject, duration, shift, color = "#0F172A",
    isAdmin, onDelete,
}: WorkspacePaperCardProps) => {

    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        startTransition(async () => {
            try
            {
                await onDelete?.();
                toast.success("Paper deleted.");
            } catch
            {
                toast.error("Failed to delete paper.");
            }
        });
    };

    return (
        <article
            className={`group relative w-85 flex flex-col p-6 bg-card border border-border/60 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-transparent ${isPending ? "opacity-50 pointer-events-none" : ""}`}
            style={{ borderTop: `4px solid ${color}` }}
        >
            {/* Admin controls */}
            {isAdmin && (
                <div className="absolute top-3 right-13 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                        href={`/library/paper/${id}/edit`}
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                    >
                        <Pencil size={13} />
                    </Link>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted text-muted-foreground">
                        {type}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted text-muted-foreground">
                        {year}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${pricing === "Free" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {pricing}
                    </span>
                </div>
                <button className="p-1.5 rounded-full hover:bg-background transition-colors">
                    <Bookmark size={16} strokeWidth={1.5} className="text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 mb-6">
                <h2 className="text-xl font-extrabold text-foreground leading-tight mb-2 uppercase tracking-tight group-hover:text-foreground transition-colors">
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {type} • {subject}
                </p>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={14} strokeWidth={1.5} className="opacity-60" />
                    <span className="text-xs font-semibold">{duration} min</span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">{shift}</div>
            </div>

            <Link
                href={`/exam/${id}/lobby`}
                className="mt-4 flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: color }}
            >
                Start Paper
            </Link>
        </article>
    );
};

export default WorkspacePaperCard;
