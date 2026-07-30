// app/(main)/settings/page.tsx
import { requireAuth } from "@/lib/auth";
import { getExamsForPicker } from "@/app/(main)/actions/onboarding-actions";
import SettingsForm from "@/components/SettingForm";

export default async function SettingsPage() {
    const user = await requireAuth();
    const exams = await getExamsForPicker();

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto w-full max-w-2xl px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Settings
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your profile and preferences.
                    </p>
                </div>
                <SettingsForm
                    exams={exams}
                    defaultValues={{
                        name: user.name ?? "",
                        targetExams: user.targetExams,
                        college: user.college ?? "",
                        region: user.region ?? "",
                    }}
                />
            </main>
        </div>
    );
}
