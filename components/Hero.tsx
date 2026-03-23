import { Search } from "lucide-react";
import Image from "next/image";

interface HeroProps {
    title: string;
    subtitle: string;
    backgroundImage: string; // Your local gallery path
}

const MinimalHero = ({ title, subtitle, backgroundImage }: HeroProps) => {
    return (
        <section className="relative w-full py-24 px-6 overflow-hidden border-b border-slate-100 bg-white rounded-md">

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
                <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent" />
            </div>

            {/* 2. Content: Left-Aligned & Clean */}
            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight leading-tight">
                        Kerala PSC <span className="font-bold">Preparation Hub</span>
                    </h1>

                    <p className="mt-4 text-lg text-slate-500 font-normal leading-relaxed">
                        {subtitle}
                    </p>

                    {/* Minimal Search Bar: No background, just a thin bottom border */}
                    <div className="mt-10 relative max-w-md group">
                        <Search
                            className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors"
                            size={20}
                            strokeWidth={1.5}
                        />
                        <input
                            type="text"
                            placeholder="Find an exam..."
                            className="w-full pl-8 py-3 bg-transparent border-b border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-900 transition-all text-lg font-medium"
                        />
                    </div>
                </div>

                {/* Minimal Breadcrumb/Stats Row */}
                <div className="mt-16 flex gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Database</span>
                        <span className="text-sm font-bold text-slate-600">850+ Papers</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Status</span>
                        <span className="text-sm font-bold text-slate-600">Exam Ready</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MinimalHero;