import { notFound } from "next/navigation";
import { getSessionPaper } from "@/lib/session-paper";
import SessionExitButton from "@/components/SessionExitButton";

export default async function PaperSessionLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ paperId: string }>;
}) {
    const { paperId } = await params;

    // Shared with the page through React cache, so this does not issue a
    // second paper/cache lookup during the same navigation.
    const paper = await getSessionPaper(paperId);

    if (!paper) notFound();

    return (
        <div className="flex h-dvh flex-col bg-background">
            <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md md:px-6">
                <div className="flex items-center gap-4">
                    <SessionExitButton />
                    <div className="h-6 w-px bg-border" />
                    <h2 className="max-w-[60vw] truncate text-sm font-bold tracking-tight text-foreground md:max-w-[70vw]">
                        {paper.title}
                    </h2>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {children}
            </div>
        </div>
    );
}
