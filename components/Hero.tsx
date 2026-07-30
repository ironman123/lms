"use client"; // Required if using Next.js App Router
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeroProps {
    title: string;
    subtitle: string;
    backgroundImage: string; // Your local gallery path
}

const MinimalHero = ({ title, subtitle, backgroundImage }: HeroProps) => {
    const [query, setQuery] = useState("");
    const router = useRouter();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && query.trim() !== "")
        {
            // Redirects to /library/paper?q=YOUR_QUERY
            router.push(`/library/paper?q=${encodeURIComponent(query)}`);
        }
    };
    return (
        <section className="relative w-full py-24 px-6 overflow-hidden border-b border-border/60 dark:border-slate-800 bg-background rounded-md">

            {/* 1. The Watermark Background */}
            <div className="absolute top-0 right-0 w-3/5 h-full z-0 pointer-events-none">
                <Image
                    src={backgroundImage}
                    alt=""
                    fill
                    priority
                    sizes="100vw" // Tells the browser the image could be the full width of the viewport
                    className="object-cover opacity-[0.7] "
                />
                {/* Soft fade out to the left */}
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
            </div>

            {/* 2. Content: Left-Aligned & Clean */}
            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-light text-foreground dark:text-slate-100 tracking-tight leading-tight">
                        {title}
                    </h1>

                    <p className="mt-4 text-lg text-muted-foreground dark:text-slate-400 font-normal leading-relaxed">
                        {subtitle}
                    </p>

                    {/* Minimal Search Bar: No background, just a thin bottom border */}
                    <div className="mt-10 relative max-w-md group">
                        <Search
                            className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/60 dark:text-slate-500 group-focus-within:text-foreground dark:group-focus-within:text-slate-100 transition-colors"
                            size={20}
                            strokeWidth={1.5}
                        />
                        <input
                            type="text"
                            placeholder="Find a questionpaper..."
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-8 py-3 bg-transparent border-b border-border dark:border-slate-800 text-foreground dark:text-slate-100 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground focus:outline-none focus:border-foreground dark:focus:border-border/60 transition-all text-lg font-medium"
                        />
                    </div>
                </div>

                {/* Minimal Breadcrumb/Stats Row */}
                <div className="mt-16 flex gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 dark:text-slate-500">Database</span>
                        <span className="text-sm font-bold text-muted-foreground dark:text-slate-300">850+ Papers</span>
                    </div>
                    <div className="w-px h-8 bg-muted dark:bg-slate-800" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 dark:text-slate-500">Status</span>
                        <span className="text-sm font-bold text-muted-foreground dark:text-slate-300">Exam Ready</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MinimalHero;
