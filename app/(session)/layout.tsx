import "@/app/(main)/globals.css"; // Ensure Tailwind and fonts are loaded
export default function SessionLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            {children}
        </div>
    );
}
