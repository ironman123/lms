"use client";

import { useState, useTransition } from "react";
import { Play, Save, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import {
    runInteractionRetentionNow,
    saveInteractionRetentionConfig,
} from "@/app/(main)/actions/retention-actions";
import type { InteractionRetentionConfigInput } from "@/lib/interaction-retention-policy";

const numberFields: Array<{
    key: "retentionDays" | "maxDetailedSessionsPerUser" | "batchSize";
    label: string;
    help: string;
    min: number;
    max: number;
}> = [
    {
        key: "retentionDays",
        label: "Detailed history age",
        help: "Archive completed interaction rows older than this many days.",
        min: 30,
        max: 3650,
    },
    {
        key: "maxDetailedSessionsPerUser",
        label: "Detailed sessions per student",
        help: "Keep at least this many newest completed sessions in the interaction table.",
        min: 5,
        max: 1000,
    },
    {
        key: "batchSize",
        label: "Sessions per maintenance run",
        help: "Bounds database work so a cleanup cannot monopolize production.",
        min: 1,
        max: 200,
    },
];

export default function InteractionRetentionSettingsForm({
    initial,
}: {
    initial: InteractionRetentionConfigInput;
}) {
    const [values, setValues] = useState(initial);
    const [pending, startTransition] = useTransition();

    const save = () => {
        startTransition(async () => {
            const result = await saveInteractionRetentionConfig(values);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setValues({
                enabled: result.config.enabled,
                retentionDays: result.config.retentionDays,
                maxDetailedSessionsPerUser:
                    result.config.maxDetailedSessionsPerUser,
                batchSize: result.config.batchSize,
            });
            toast.success("Interaction retention settings saved.");
        });
    };

    const run = (dryRun: boolean) => {
        startTransition(async () => {
            const result = await runInteractionRetentionNow(dryRun);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            if (result.result.status === "disabled") {
                toast.error("Enable retention before running cleanup.");
                return;
            }
            const label = dryRun ? "eligible" : "archived";
            toast.success(
                `${result.result.archivedSessions} sessions ${label}; ${result.result.deletedInteractions} interaction rows${dryRun ? " would be removed" : " removed"}.`
            );
        });
    };

    return (
        <div className="space-y-5">
            <label className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <input
                    type="checkbox"
                    checked={values.enabled}
                    disabled={pending}
                    onChange={(event) =>
                        setValues((current) => ({
                            ...current,
                            enabled: event.target.checked,
                        }))
                    }
                    className="mt-1 size-5 accent-primary"
                />
                <span>
                    <span className="block text-sm font-black">
                        Enable scheduled retention
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        Disabled by default. Cleanup still refuses sessions whose
                        summaries, statistics, mistake state, or review archive
                        cannot be verified.
                    </span>
                </span>
            </label>

            {numberFields.map((field) => (
                <label
                    key={field.key}
                    className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_140px] sm:items-center"
                >
                    <span>
                        <span className="block text-sm font-black">{field.label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {field.help}
                        </span>
                    </span>
                    <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={values[field.key]}
                        disabled={pending}
                        onChange={(event) =>
                            setValues((current) => ({
                                ...current,
                                [field.key]: Number(event.target.value),
                            }))
                        }
                        className="h-11 rounded-xl border border-input bg-background px-3 text-right text-sm font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                </label>
            ))}

            <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] grid gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:grid-cols-[1fr_auto_auto]">
                <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-60"
                >
                    <Save size={16} /> Save settings
                </button>
                <button
                    type="button"
                    onClick={() => run(true)}
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-black disabled:opacity-60"
                >
                    <ScanSearch size={16} /> Dry run
                </button>
                <button
                    type="button"
                    onClick={() => run(false)}
                    disabled={pending || !values.enabled}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-5 text-sm font-black text-destructive disabled:opacity-40"
                >
                    <Play size={16} /> Run cleanup
                </button>
            </div>
        </div>
    );
}
