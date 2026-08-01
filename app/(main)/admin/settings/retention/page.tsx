import InteractionRetentionSettingsForm from "@/components/InteractionRetentionSettingsForm";
import {
    getInteractionRetentionConfig,
    getRecentInteractionRetentionRuns,
} from "@/lib/interaction-retention";

export default async function InteractionRetentionSettingsPage() {
    const [config, runs] = await Promise.all([
        getInteractionRetentionConfig(),
        getRecentInteractionRetentionRuns(),
    ]);

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 pb-32 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Data retention
            </p>
            <h2 className="mt-2 text-3xl font-black">Interaction lifecycle</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Old per-question rows are compacted into a review archive only
                after the completed result, aggregate statistics, exam
                statistics, and mistake notebook projection are verified.
            </p>
            <div className="mt-7">
                <InteractionRetentionSettingsForm
                    initial={{
                        enabled: config.enabled,
                        retentionDays: config.retentionDays,
                        maxDetailedSessionsPerUser:
                            config.maxDetailedSessionsPerUser,
                        batchSize: config.batchSize,
                    }}
                />
            </div>

            <section className="mt-10 rounded-2xl border border-border bg-card p-5">
                <h3 className="font-black">Recent maintenance runs</h3>
                {runs.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        No retention runs yet.
                    </p>
                ) : (
                    <div className="mt-4 divide-y divide-border">
                        {runs.map((run) => (
                            <div key={run.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]">
                                <div>
                                    <p className="font-bold">
                                        {run.dryRun ? "Dry run" : "Cleanup"} · {run.archivedSessions} sessions · {run.deletedInteractions} interactions
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Examined {run.examinedSessions}; skipped {run.skippedSessions}
                                        {run.error ? ` · Failed: ${run.error}` : ""}
                                    </p>
                                </div>
                                <time className="text-xs text-muted-foreground">
                                    {new Intl.DateTimeFormat("en-IN", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    }).format(run.startedAt)}
                                </time>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
