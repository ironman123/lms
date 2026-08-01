// components/WorkspacePaperCard.tsx
"use client";
import { deleteQuestionPaper } from "@/app/(main)/actions/paper-actions";
import Link from "next/link";
import { Archive, Clock, Loader2, Pencil, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkspacePaperCardProps {
    id: string | number;
    title: string;
    type: string;
    year?: string;
    pricing: string;
    examId: string;
    sessionExamId?: string;
    examSlug: string;
    subject: string;
    duration: number;
    shift: string;
    color?: string;
    isAdmin?: boolean;
    status?: "DRAFT" | "PUBLISHED";
    resumableSession?: {
        id: string;
        mode: "PRACTICE" | "MOCK";
    };
}

const WorkspacePaperCard = ({
    id, title, type, year, pricing,
    subject, duration, shift, color = "#0F172A",
    isAdmin, status, examSlug, resumableSession, sessionExamId,
}: WorkspacePaperCardProps) => {

    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleArchive = () => {
        startTransition(async () => {
            try
            {
                await deleteQuestionPaper(String(id), examSlug);
                toast.success("Paper archived.", {
                    description: "It can be restored from Archived Papers.",
                });
                router.refresh();
            } catch
            {
                toast.error("Failed to archive paper.");
            }
        });
    };

    return (
        <article
            className={`group relative flex w-full min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-xl sm:p-6 ${isPending ? "pointer-events-none opacity-60" : ""}`}
            style={{ borderTop: `4px solid ${color}` }}
        >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted text-muted-foreground">
                        {type}
                    </span>
                    {year && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {year}
                        </span>
                    )}
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pricing === "Free" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>
                        {pricing}
                    </span>
                </div>
                {isAdmin && status === "DRAFT" && (
                    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Draft
                    </span>
                )}
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
            <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={14} strokeWidth={1.5} className="opacity-60" />
                    <span className="text-xs font-semibold">{duration} min</span>
                </div>
                <div className="text-xs font-bold text-muted-foreground">{shift}</div>
            </div>

            {isAdmin && (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-4">
                    <Link
                        href={`/library/paper/${id}/edit`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Edit ${title}`}
                    >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                    </Link>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button
                                type="button"
                                disabled={isPending}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:opacity-50 dark:text-rose-300"
                                aria-label={`Archive ${title}`}
                            >
                                {isPending ? (
                                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                ) : (
                                    <Archive size={16} aria-hidden="true" />
                                )}
                                {isPending ? "Archiving" : "Archive"}
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Archive this paper?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    “{title}” will disappear from the paper library and cannot be used for new sessions. Existing session history is preserved, and an administrator can restore the paper later.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep paper</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleArchive}
                                    className="bg-rose-600 text-white hover:bg-rose-700"
                                >
                                    Archive paper
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {!(isAdmin && status === "DRAFT") && (
                <Link
                    href={
                        resumableSession
                            ? `/exam/${id}/${resumableSession.mode.toLowerCase()}?sessionId=${resumableSession.id}`
                            : `/exam/${id}/lobby${sessionExamId ? `?examId=${encodeURIComponent(sessionExamId)}` : ""}`
                    }
                    className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ backgroundColor: color }}
                >
                    {resumableSession && <RotateCcw size={14} aria-hidden="true" />}
                    {resumableSession
                        ? `Resume ${
                            resumableSession.mode === "PRACTICE"
                                ? "Practice"
                                : "Mock"
                        }`
                        : "Start Paper"}
                </Link>
            )}
        </article>
    );
};

export default WorkspacePaperCard;
