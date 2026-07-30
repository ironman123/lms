import prisma from "@/lib/prisma";
import NewExamForm from "@/components/NewExamForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ categoryId?: string }> }) {
    await requireAdminPage(); // Ensure only admins can access this page
    // Fetch categories here. Since this is a Server Component, 
    // this code runs on the backend, not the user's browser.

    const { categoryId } = await searchParams;

    const categories = await prisma.examCategory.findMany({
        select: {
            id: true,
            name: true,
            color: true,
        },
        orderBy: { name: 'asc' }
    });



    return (
        <div className="min-h-screen bg-background py-12">
            <div className="max-w-5xl mx-auto px-4">

                {/* Back Link */}
                <Link
                    href="/library/exam"
                    className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Exams
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Create <span className="text-muted-foreground font-light">New Exam</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Add a new exam classification like &quot;Degree Level&quot;, &quot;Technical&quot;, or &quot;10th Level&quot;.
                    </p>
                </div>

                {/* Pass the data down as a prop */}
                <NewExamForm categories={categories} defaultCategoryId={categoryId} />
            </div>
        </div>
    );

}
