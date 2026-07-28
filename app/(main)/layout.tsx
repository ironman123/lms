// app/(main)/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import LibrarySidebar from "@/components/LibrarySidebar";
import { getOptionalUser } from "@/lib/auth";
import PushRegistrar from "@/components/PushRegistrar";

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

  return (
    <>
      <Navbar />
      <DynamicBreadcrumb />
      <div className="relative">
        <LibrarySidebar />
        <main>
          {user && <PushRegistrar />}
          {children}
        </main>
      </div>
    </>
  );
}
