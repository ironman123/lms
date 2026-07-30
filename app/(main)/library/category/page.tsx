// app/(main)/library/category/page.tsx
import prisma from "@/lib/prisma";
import ExamCategoryCard from "@/components/ExamCategoryCard";
import SearchFilter from "@/components/SearchFilter";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { deleteCategory } from "@/app/(main)/actions/category-actions";
import { getIsAdmin } from "@/lib/auth";
import { withCache } from "@/lib/cache";

export default async function CategoryIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const query = (await searchParams).q ?? "";
    const cacheKey = `categories:q:${query}`;

    const [categories, isAdmin] = await Promise.all([
        withCache(
            cacheKey,
            3600,
            () =>
                prisma.examCategory.findMany({
                    where: query
                        ? {
                            OR: [
                                { name: { contains: query, mode: "insensitive" } },
                                { description: { contains: query, mode: "insensitive" } },
                            ],
                        }
                        : {},
                    orderBy: { createdAt: "desc" },
                }),
            ["examCategories"]
        ),
        getIsAdmin(),
    ]);

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
                        Browse <span className="text-muted-foreground font-light">Categories</span>
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Select your specialized field to discover tailored exam workspaces,
                        previous year questions, and dedicated mock tests.
                    </p>
                </div>

                {isAdmin && (
                    <Link
                        href="/library/category/new"
                        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 md:bottom-8 md:right-8 md:z-50"
                        title="Add New Category"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>
                )}

                <div className="flex justify-center mb-16 w-full">
                    <div className="w-full max-w-md">
                        <SearchFilter value={query} />
                    </div>
                </div>

                {categories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                        {categories.map((cat) => {
                            const boundDelete = deleteCategory.bind(null, cat.id);
                            return (
                                <ExamCategoryCard
                                    key={cat.id}
                                    {...cat}
                                    isAdmin={isAdmin}
                                    onDelete={boundDelete}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="col-span-full p-12 border-2 border-dashed border-border rounded-3xl text-center bg-card max-w-2xl mx-auto w-full">
                        <Search className="w-10 h-10 text-muted-foreground/60 mb-4 mx-auto" />
                        <h3 className="text-lg font-bold text-foreground tracking-tight">
                            No categories found
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            We couldn't find any categories matching{" "}
                            <span className="font-bold text-foreground">"{query}"</span>.
                        </p>
                        <Link
                            href="/library/category"
                            scroll={false}
                            className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-muted text-foreground/80 text-sm font-bold rounded-xl hover:bg-muted transition-colors"
                        >
                            Clear search
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
