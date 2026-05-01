// app/(main)/library/notifications/new/layout.tsx
import { requireAdminPage } from "@/lib/auth";

export default async function NotifNewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdminPage();
    return <>{children}</>;
}