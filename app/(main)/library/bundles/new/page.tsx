// app/(main)/library/bundles/new/page.tsx
import { requireAdminPage } from "@/lib/auth";
import CreateBundleForm from "@/components/CreateBundleForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewBundlePage() {
    await requireAdminPage();
    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-2xl mx-auto px-4 py-12">
                <Link
                    href="/library/bundles"
                    className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                    <ChevronLeft size={16} className="mr-1" /> Back to Bundles
                </Link>
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Create <span className="text-muted-foreground font-light">Bundle</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Package exam papers for students to purchase.
                    </p>
                </div>
                <CreateBundleForm />
            </main>
        </div>
    );
}