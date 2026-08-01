"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
    abandonExamSession,
    pauseExamSession,
} from "@/app/(main)/actions/session-actions";
import { requestSessionCheckpoint } from "@/lib/session-checkpoint-client";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAPERS_PATH = "/library/paper";

export default function SessionExitButton({
    returnPath = PAPERS_PATH,
}: {
    returnPath?: string;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get("sessionId");
    const isActiveSession =
        pathname.endsWith("/mock") ||
        pathname.endsWith("/practice") ||
        pathname.startsWith("/repair/");
    const [open, setOpen] = useState(false);
    const [confirmingAbandon, setConfirmingAbandon] = useState(false);
    const [pendingAction, setPendingAction] = useState<
        "pause" | "abandon" | null
    >(null);

    const resetDialog = () => {
        if (pendingAction) return;
        setOpen(false);
        setConfirmingAbandon(false);
    };

    const saveAndExit = async () => {
        if (!sessionId) return;
        setPendingAction("pause");

        const checkpointSaved = await requestSessionCheckpoint();
        if (!checkpointSaved) {
            toast.error(
                "We could not save your latest progress. Please try again."
            );
            setPendingAction(null);
            return;
        }

        const result = await pauseExamSession(sessionId);
        if (!result.success) {
            toast.error(result.error ?? "Unable to pause this session.");
            setPendingAction(null);
            return;
        }

        toast.success("Progress saved. You can resume this session later.");
        setOpen(false);
        router.push(returnPath);
        router.refresh();
    };

    const abandonAttempt = async () => {
        if (!sessionId) return;
        setPendingAction("abandon");

        // Preserve the latest answer/flag snapshot for audit and support
        // purposes even though abandoned attempts are not scored.
        await requestSessionCheckpoint();
        const result = await abandonExamSession(sessionId);
        if (!result.success) {
            toast.error(result.error ?? "Unable to abandon this session.");
            setPendingAction(null);
            return;
        }

        toast.success("Attempt abandoned. It will not count toward your stats.");
        setOpen(false);
        router.push(returnPath);
        router.refresh();
    };

    const trigger = (
        <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl bg-card shadow-sm"
            aria-label={isActiveSession ? "Leave session" : "Back to papers"}
            title={isActiveSession ? "Leave session" : "Back to papers"}
        >
            <X aria-hidden="true" />
        </Button>
    );

    if (!isActiveSession || !sessionId) {
        return <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-card shadow-sm">
            <Link
                href={returnPath}
                aria-label="Back to papers"
                title="Back to papers"
            >
                <X aria-hidden="true" />
            </Link>
        </Button>;
    }

    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (pendingAction) return;
                setOpen(nextOpen);
                if (!nextOpen) setConfirmingAbandon(false);
            }}
        >
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-card sm:max-w-md">
                {confirmingAbandon ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Abandon this attempt?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This attempt will be closed and cannot be
                                resumed. It will not be included in your score
                                or profile statistics.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmingAbandon(false)}
                                disabled={pendingAction !== null}
                            >
                                Back
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={abandonAttempt}
                                disabled={pendingAction !== null}
                            >
                                {pendingAction === "abandon" ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Trash2 />
                                )}
                                Confirm abandon
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Leave this session?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Save your current answers and resume later, or
                                permanently abandon this attempt.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:flex-wrap">
                            <Button
                                variant="ghost"
                                onClick={resetDialog}
                                disabled={pendingAction !== null}
                            >
                                Continue session
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmingAbandon(true)}
                                disabled={pendingAction !== null}
                            >
                                <Trash2 />
                                Abandon
                            </Button>
                            <Button
                                onClick={saveAndExit}
                                disabled={pendingAction !== null}
                            >
                                {pendingAction === "pause" ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save />
                                )}
                                Save and exit
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
}
