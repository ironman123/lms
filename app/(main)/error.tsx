"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error("Main route error", error); }, [error]);
    return <main className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 text-center">
        <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
            <AlertTriangle className="mx-auto size-10 text-amber-500" aria-hidden />
            <h1 className="mt-4 text-2xl font-black">This page could not load</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your data was not changed. Please try loading this screen again.</p>
            <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground">Try again</button>
        </div>
    </main>;
}
