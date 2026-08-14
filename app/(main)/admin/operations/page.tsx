import { getOperationalReadiness } from "@/lib/operational-readiness";

export default function AdminOperationsPage() {
    const readiness = getOperationalReadiness();
    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Production readiness</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">System operations</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">This checks whether the deployed runtime has the services needed for reliable sessions, scheduled recovery, and notifications. Secret values are never shown here.</p>
            <section className={`mt-6 rounded-2xl border p-5 ${readiness.ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                <p className="text-sm font-black">{readiness.ready ? "Required production services are configured." : `${readiness.missingRequired.length} required configuration item${readiness.missingRequired.length === 1 ? "" : "s"} missing.`}</p>
                {!readiness.ready && <p className="mt-1 text-sm text-muted-foreground">Update these values in Vercel before relying on background processing: {readiness.missingRequired.join(", ")}.</p>}
            </section>
            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border px-5 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground"><span>Service</span><span>State</span></div>
                {readiness.checks.map((check) => (
                    <div key={check.key} className="grid grid-cols-[1fr_auto] gap-4 border-b border-border/70 px-5 py-4 last:border-b-0">
                        <div><p className="text-sm font-bold">{check.label}{check.required ? "" : " (optional)"}</p><p className="mt-1 text-xs text-muted-foreground">{check.guidance}</p></div>
                        <span className={`my-auto rounded-full px-2.5 py-1 text-xs font-black ${check.configured ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{check.configured ? "Configured" : "Missing"}</span>
                    </div>
                ))}
            </section>
        </main>
    );
}
