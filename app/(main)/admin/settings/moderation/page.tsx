import ModerationSettingsForm from "@/components/ModerationSettingsForm";
import {
    getModerationConfig,
    getRecentModerationConfigAudits,
} from "@/lib/moderation/admin-service";

export default async function ModerationSettingsPage() {
    const [config, audits] = await Promise.all([
        getModerationConfig(),
        getRecentModerationConfigAudits(),
    ]);

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 pb-32 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Moderation settings
            </p>
            <h2 className="mt-2 text-3xl font-black">
                Escalation and abuse limits
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Thresholds count distinct students, not clicks. Changing a
                threshold immediately re-evaluates every open case.
            </p>
            <div className="mt-7">
                <ModerationSettingsForm initial={config} />
            </div>
            {audits.length > 0 && (
                <section className="mt-10 rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-black">Recent setting changes</h3>
                    <div className="mt-4 divide-y divide-border">
                        {audits.map((audit) => (
                            <div
                                key={audit.id}
                                className="flex flex-col justify-between gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row"
                            >
                                <p className="text-sm font-bold">
                                    {audit.actor.name ?? audit.actor.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Intl.DateTimeFormat("en-IN", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    }).format(audit.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
