import { notFound } from "next/navigation";
import { getSessionPaper } from "@/lib/session-paper";
import SessionExitButton from "@/components/SessionExitButton";

export default async function RepairSessionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ paperId: string }>;
}) {
    const { paperId } = await params;
    const paper = await getSessionPaper(paperId);
    if (!paper) notFound();

    return (
        <div className="flex h-dvh flex-col bg-background">
            <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-border bg-background/95 px-4 backdrop-blur-md md:px-6">
                <div className="flex min-w-0 items-center gap-4">
                    <SessionExitButton returnPath="/dashboard/repair" />
                    <div className="h-6 w-px shrink-0 bg-border" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">Today’s Repair</p>
                        <h2 className="truncate text-sm font-bold text-foreground">{paper.title}</h2>
                    </div>
                </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {children}
            </div>
        </div>
    );
}
