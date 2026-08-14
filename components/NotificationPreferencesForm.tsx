"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateNotificationPreferences } from "@/app/(main)/actions/notification-actions";

type Preferences = {
    inAppEnabled: boolean;
    pushEnabled: boolean;
    examUpdatesEnabled: boolean;
    practiceUpdatesEnabled: boolean;
};

export default function NotificationPreferencesForm({ initial }: { initial: Preferences }) {
    const [value, setValue] = useState(initial);
    const [pending, startTransition] = useTransition();
    const set = (key: keyof Preferences, checked: boolean) => setValue((current) => ({ ...current, [key]: checked }));

    return (
        <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex gap-3"><BellRing className="mt-0.5 text-primary" size={19} /><div><h2 className="text-sm font-black uppercase tracking-widest">Notifications</h2><p className="mt-1 text-sm text-muted-foreground">Choose which useful updates you want to receive. Browser push also needs permission on this device.</p></div></div>
            <div className="mt-5 space-y-3">
                {[
                    ["inAppEnabled", "In-app notifications", "Show updates in the notification bell."],
                    ["pushEnabled", "Browser push", "Allow push to devices you have subscribed."],
                    ["examUpdatesEnabled", "Exam dates and announcements", "Official dates and exam updates."],
                    ["practiceUpdatesEnabled", "New papers and practice", "New mock and practice-paper updates."],
                ].map(([key, label, detail]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3 hover:border-primary/40">
                        <input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" checked={value[key as keyof Preferences]} onChange={(event) => set(key as keyof Preferences, event.target.checked)} />
                        <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span>
                    </label>
                ))}
            </div>
            <button type="button" disabled={pending} onClick={() => startTransition(async () => {
                const result = await updateNotificationPreferences(value);
                if (result.success) toast.success("Notification preferences saved.");
                else toast.error("Could not save preferences.");
            })} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
                {pending && <Loader2 size={15} className="animate-spin" />} Save notification preferences
            </button>
        </section>
    );
}
