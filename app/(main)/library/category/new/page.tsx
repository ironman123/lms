import NewCategoryForm from "@/components/NewCategoryForm"; // Adjust path as needed
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewCategoryPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-5xl mx-auto px-4">

                {/* Back Link */}
                <Link
                    href="/library/category"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Categories
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Create <span className="text-slate-400 font-light">New Category</span>
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Add a new exam classification like "Degree Level", "Technical", or "10th Level".
                    </p>
                </div>

                {/* The Form You Built */}
                <NewCategoryForm />

            </div>
        </div>
    );
}