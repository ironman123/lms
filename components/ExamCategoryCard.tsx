import Image from "next/image";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Briefcase, GraduationCap, Cpu } from "lucide-react";

interface CategoryCardProps {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    image: string;
    color: string;
}

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

const ExamCategoryCard = ({ id, name, slug, description, icon, image, color }: CategoryCardProps) => {
    console.log("Slug: ", slug);
    return (
        <Link href={`/library/category/${slug}`} className="group block">
            <article className="relative h-64 flex flex-col justify-end p-6 bg-white border border-slate-200 rounded-xl transition-all duration-500 hover:shadow-2xl hover:border-slate-300 overflow-hidden">

                {/* Background Image: Very subtle, darkened overlay */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-linear-to-t from-white via-white/80 to-transparent z-10" />
                    <Image
                        src={image}
                        alt=""
                        fill
                        className="object-cover opacity-75  group-hover:scale-105 group-hover:opacity-98 transition-all duration-1000"
                    />
                </div>

                {/* Content */}
                <div className="relative z-20">
                    <div className="mb-4">
                        <DynamicIcon name={icon} color={color} />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-black transition-colors">
                        {name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1 mb-4 line-clamp-3 max-w-[240px]">
                        {description}
                    </p>
                </div>
            </article>
        </Link>
    );
};

export default ExamCategoryCard;