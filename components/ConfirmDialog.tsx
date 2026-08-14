"use client";

import { Loader2 } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** A mobile-friendly confirmation pattern for irreversible admin actions. */
export default function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Delete", pending = false, onConfirm }: {
    open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
    confirmLabel?: string; pending?: boolean; onConfirm: () => void;
}) {
    return <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={pending} onClick={(event) => { event.preventDefault(); onConfirm(); }}>
                    {pending && <Loader2 className="animate-spin" aria-hidden />}{confirmLabel}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>;
}
