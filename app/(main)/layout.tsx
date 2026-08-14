// app/(main)/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import LibrarySidebar from "@/components/LibrarySidebar";
import { getOptionalUser } from "@/lib/auth";
import PushRegistrar from "@/components/PushRegistrar";
import { getNotificationSeenAt, getRecentNotifications } from "./actions/notification-actions";

export const metadata: Metadata = {
  title: "Converso",
  description: "All Exams. One Platform.",
};

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getOptionalUser();
  const [notifications, seenAt] = user
    ? await Promise.all([getRecentNotifications(), getNotificationSeenAt(user.id)])
    : [[], null];
  const hasUnreadNotifications = notifications.some(
    (notification) => !seenAt || notification.createdAt > new Date(seenAt)
  );

  return (
    <>
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[110] rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground focus:not-sr-only">Skip to main content</a>
      <Navbar />
      <DynamicBreadcrumb />
      <div className="relative">
        <LibrarySidebar hasUnreadNotifications={hasUnreadNotifications} />
        <main id="main-content" className="w-full pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0" tabIndex={-1}>
          {user && <PushRegistrar />}
          {children}
        </main>
      </div>
    </>
  );
}
