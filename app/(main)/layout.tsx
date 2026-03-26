import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import { ClerkProvider } from '@clerk/nextjs'

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Converso",
  description: "All Exams. One Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} antialiased`}>
        <ClerkProvider appearance={{ variables: { colorPrimary: '#fe5933' } }}>
          <Navbar />
          <DynamicBreadcrumb />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
