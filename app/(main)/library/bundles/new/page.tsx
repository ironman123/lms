// app/(main)/library/bundles/new/page.tsx
import { requireAdminPage } from "@/lib/auth";
import CreateBundleForm from "@/components/CreateBundleForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewBundlePage() {
    await requireAdminPage();
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-2xl mx-auto px-4 py-12">
                <Link
                    href="/library/bundles"
                    className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-8"
                >
                    <ChevronLeft size={16} className="mr-1" /> Back to Bundles
                </Link>
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Create <span className="text-slate-400 font-light">Bundle</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Package exam papers for students to purchase.
                    </p>
                </div>
                <CreateBundleForm />
            </main>
        </div>
    );
}