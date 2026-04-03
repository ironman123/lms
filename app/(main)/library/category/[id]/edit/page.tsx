import prisma from "@/lib/prisma";
import NewCategoryForm from "@/components/NewCategoryForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
    const { id: slug } = await params;

    const category = await prisma.examCategory.findUnique({
        where: { slug },
    });

    if (!category) notFound();

    const initialData = {
        id: category.id,
        name: category.name,
        description: category.description ?? "",
        icon: category.icon ?? "Briefcase",
        color: category.color ?? "#1D3557",
        image: category.image ?? "",
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-5xl mx-auto px-4">
                <Link
                    href={`/library/category/${slug}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to {category.name}
                </Link>

                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Edit <span className="text-slate-400 font-light">{category.name}</span>
                    </h1>
                </div>

                <NewCategoryForm initialData={initialData} />
            </div>
        </div>
    );
}