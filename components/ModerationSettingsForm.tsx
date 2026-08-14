"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { saveModerationConfig } from "@/app/(main)/actions/moderation-actions";
import type { ModerationConfigInput } from "@/lib/moderation/schemas";

const fields: Array<{
    key: keyof ModerationConfigInput;
    label: string;
    help: string;
}> = [
    {
        key: "questionReportThreshold",
        label: "Question attention threshold",
        help: "Unique students required before a question case needs attention.",
    },
    {
        key: "paperReportThreshold",
        label: "Paper attention threshold",
        help: "Unique students required before a paper case needs attention.",
    },
    {
        key: "reportLimitPerHour",
        label: "Reports per hour",
        help: "Maximum new report cases one student can create in one hour.",
    },
    {
        key: "reportLimitPerDay",
        label: "Reports per day",
        help: "Maximum new report cases one student can create in 24 hours.",
    },
    {
        key: "maxCommentLength",
        label: "Maximum comment length",
        help: "Server-enforced character limit for report details.",
    },
];

export default function ModerationSettingsForm({
    initial,
}: {
    initial: ModerationConfigInput;
}) {
    const [values, setValues] = useState(initial);
    const [pending, startTransition] = useTransition();

    const save = () => {
        startTransition(async () => {
            const result = await saveModerationConfig(values);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            setValues(result.config);
            toast.success(
                "Moderation settings saved and open cases re-evaluated."
            );
        });
    };

    return (
        <div className="space-y-5">
            {fields.map((field) => (
                <label
                    key={field.key}
                    className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_140px] sm:items-center"
                >
                    <span>
                        <span className="block text-sm font-black text-foreground">
                            {field.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {field.help}
                        </span>
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={
                            field.key === "maxCommentLength" ? 5000 : 10000
                        }
                        value={values[field.key]}
                        disabled={pending}
                        onChange={(event) =>
                            setValues((current) => ({
                                ...current,
                                [field.key]: Number(event.target.value),
                            }))
                        }
                        className="h-11 rounded-xl border border-input bg-background px-3 text-right text-sm font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                </label>
            ))}

            <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex justify-end rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur md:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                >
                    <Save size={16} />
                    {pending ? "Saving…" : "Save moderation settings"}
                </button>
            </div>
        </div>
    );
}
