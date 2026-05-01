// app/(main)/library/bundles/new/layout.tsx
import { requireAdminPage } from "@/lib/auth";

export default async function BundleNewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdminPage();
    return <>{children}</>;
}