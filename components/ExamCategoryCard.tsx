"use client";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import * as Icons from "lucide-react";
import { Trash2, Edit } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

interface DynamicIconProps {
    name: string;
    color?: string;
    size?: number;
}

const DynamicIcon = ({ name, color, size = 28 }: DynamicIconProps) => {
    const LucideIcon = (Icons as any)[name];
    if (!LucideIcon) return <Icons.HelpCircle size={size} color={color} />;
    return <LucideIcon color={color} size={size} strokeWidth={1.5} />;
};

export default function ExamCategoryCard({
    name,
    slug,
    description,
    icon,
    image,
    color,
    isAdmin,
    onDelete,
}: any) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        startTransition(async () => {
            try
            {
                await onDelete();
                toast.success(`"${name}" deleted.`);
            } catch
            {
                toast.error("Failed to delete category.");
            }
        });
    };

    return (
        <div className="group relative block">
            <Link href={`/library/category/${slug}`}>
                <article className={`group relative h-64 flex flex-col justify-end p-6 bg-white border border-slate-300 rounded-xl transition-all duration-500 hover:shadow-2xl hover:border-slate-300 overflow-hidden cursor-pointer ${isPending ? "opacity-50 pointer-events-none" : ""}`}>

                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
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

                    {/* Content */}
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
                        <div className="h-1 w-0 bg-slate-700 transition-all duration-600 group-hover:w-full mt-2 rounded-full" />
                    </div>
                </article>
            </Link>

            {/* Admin controls — outside the Link so clicks don't navigate */}
            {isAdmin && (
                <div className="absolute top-3 right-3 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                        href={`/library/category/${slug}/edit`}
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                    >
                        <Edit size={13} />
                    </Link>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}