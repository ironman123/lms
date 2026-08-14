"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { discardDraftQuestionPaper } from "@/app/(main)/actions/paper-actions";
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

export default function DiscardDraftPaperButton({ id, title }: { id: string; title: string }) {
    const [pending, startTransition] = useTransition();
    const router = useRouter();
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button type="button" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 text-xs font-black text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300">
                    <Trash2 size={14} /> Discard draft
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Discard this unpublished draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                        “{title}” and its active questions will be archived. It will no longer appear in drafts or the library, but no historical records are destroyed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep draft</AlertDialogCancel>
                    <AlertDialogAction onClick={() => startTransition(async () => {
                        const result = await discardDraftQuestionPaper(id, "");
                        if (!result.success) {
                            toast.error(result.error);
                            return;
                        }
                        toast.success("Draft discarded.");
                        router.refresh();
                    })} className="bg-rose-600 text-white hover:bg-rose-700">
                        {pending ? "Discarding…" : "Discard draft"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
