"use client"; // Required for next-cloudinary components
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import * as Icons from "lucide-react";

interface DynamicIconProps {
    name: string; // The string from your DB, e.g., "Briefcase"
    color?: string;
    size?: number;
}

const DynamicIcon = ({ name, color, size = 28 }: DynamicIconProps) => {
    // Access the icon component dynamically from the Lucide library
    const LucideIcon = (Icons as any)[name];

    if (!LucideIcon)
    {
        return <Icons.HelpCircle size={size} color={color} />; // Fallback icon
    }

    return <LucideIcon color={color} size={size} strokeWidth={1.5} />;
};

export default function ExamCategoryCard({
    name,
    slug,
    description,
    icon,
    image, // This is now your Cloudinary Public ID (e.g., "kpsc/general")
    color
}: any) {
    return (
        <Link href={`/library/category/${slug}`} className="group block">
            <article className="group relative h-64 flex flex-col justify-end p-6 bg-white border border-slate-300 rounded-xl transition-all duration-500 hover:shadow-2xl hover:border-slate-300 overflow-hidden cursor-pointer">

                {/* Background Image Container */}
                <div className="absolute inset-0 z-0">
                    {/* Refined Overlay: 
                   Bottom-heavy gradient ensures text readability while letting 
                   the top of the image shine through.
                */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/75 to-transparent z-10 transition-opacity duration-500 group-hover:opacity-90" />

                    {image && (
                        <CldImage
                            src={image}
                            alt={name || "Preview"}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                            className="object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000 ease-in-out"
                            crop="fill"
                            gravity="auto"
                            format="auto"
                            quality="auto"
                        />
                    )}
                </div>

                {/* Content Section */}
                <div className="relative z-20">
                    <div className="mb-4 transform transition-transform duration-500 group-hover:-translate-y-1">
                        <DynamicIcon name={icon} color={color} />
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-black transition-colors">
                        {name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2 mb-2 line-clamp-3 max-w-[260px] leading-relaxed group-hover:text-slate-700 transition-colors">
                        {description}
                    </p>

                    {/* Subtle "Explore" indicator that appears on hover */}
                    <div className="h-1 w-0 bg-slate-700 transition-all duration-600 group-hover:w-full mt-2 rounded-full" />
                </div>
            </article>
        </Link>
    );
}

