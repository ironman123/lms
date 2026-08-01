import Link from "next/link";
import { Archive, FilePenLine, Library, MessageSquareMore, Settings, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdminPage();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                            Admin console
                        </p>
                        <h1 className="mt-1 text-xl font-black">
                            Content operations
                        </h1>
                    </div>
                    <nav
                        aria-label="Admin navigation"
                        className="flex gap-2 overflow-x-auto"
                    >
                        <Link
                            href="/admin/feedback"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <MessageSquareMore size={16} />
                            App feedback
                        </Link>
                        <Link
                            href="/admin/moderation"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <ShieldCheck size={16} />
                            Moderation
                        </Link>
                        <Link
                            href="/admin/settings/moderation"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <Settings size={16} />
                            Settings
                        </Link>
                        <Link
                            href="/admin/papers/drafts"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <FilePenLine size={16} />
                            Draft papers
                        </Link>
                        <Link
                            href="/admin/papers/archived"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <Archive size={16} />
                            Archived papers
                        </Link>
                        <Link
                            href="/library"
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:border-primary/40 hover:text-primary"
                        >
                            <Library size={16} />
                            Library
                        </Link>
                    </nav>
                </div>
            </div>
            {children}
        </div>
    );
}
