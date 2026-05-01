// app/onboarding/page.tsx
import { requireAuth } from "@/lib/auth";
import { getExamsForPicker } from "@/app/(main)/actions/onboarding-actions";
import OnboardingForm from "@/components/OnboardingForm";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
    const user = await requireAuth();

    // Already onboarded — send them home
    if (user.onboarded) redirect("/dashboard");

    const exams = await getExamsForPicker();

    return (
        <OnboardingForm
            exams={exams}
            defaultName={user.name ?? ""}
        />
    );
}