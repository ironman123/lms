// app/(main)/layout.tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import LibrarySidebar from "@/components/LibrarySidebar";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Converso",
  description: "All Exams. One Platform.",
};

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <DynamicBreadcrumb />
      <div className="relative">
        <LibrarySidebar />
        <main>
          {children}
        </main>
      </div>
    </>
  );
}
