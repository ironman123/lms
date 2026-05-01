// app/(main)/library/notifications/new/page.tsx
import { requireAdminPage } from "@/lib/auth";
import SendNotificationForm from "@/components/SendNotificationForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewNotificationPage() {
    // Protect the route on the server
    await requireAdminPage();

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-2xl mx-auto px-4 py-12">
                <Link
                    href="/library/notifications"
                    className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-8"
                >
                    <ChevronLeft size={16} className="mr-1" /> Back
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Send <span className="text-slate-400 font-light">Notification</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Push a notification to subscribed users.
                    </p>
                </div>

                {/* Render the interactive client form */}
                <SendNotificationForm />
            </main>
        </div>
    );
}