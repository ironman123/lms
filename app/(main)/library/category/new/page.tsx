import NewCategoryForm from "@/components/NewCategoryForm"; // Adjust path as needed
import { requireAdminPage } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewCategoryPage() {
    await requireAdminPage(); // Ensure only admins can access this page
    return (
        <div className="min-h-screen bg-background py-12">
            <div className="max-w-5xl mx-auto px-4">

                {/* Back Link */}
                <Link
                    href="/library/category"
                    className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Categories
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Create <span className="text-muted-foreground font-light">New Category</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Add a new exam classification like &quot;Degree Level&quot;, &quot;Technical&quot;, or &quot;10th Level&quot;.
                    </p>
                </div>

                {/* The Form You Built */}
                <NewCategoryForm />

            </div>
        </div>
    );
}
