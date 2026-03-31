import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import PaperForm from "@/components/PaperForm"; // You will build this

interface PageProps {
    params: Promise<{ id: string }>; // This is the exam slug
    searchParams: Promise<{ examId?: string }>;
}

export default async function NewPaperPage({ params, searchParams }: PageProps) {
    const { id: examSlug } = await params;
    const { examId } = await searchParams;

    if (!examId) return <div>Missing Exam ID</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <Link
                    href={`/library/exam/${examSlug}`}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Workspace
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Create <span className="text-slate-400 font-light">Question Paper</span>
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Set up the container for your questions. Leave the year blank if this is a Mock test.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    {/* Pass the IDs down to your Client Component form */}
                    <PaperForm examId={examId} examSlug={examSlug} />
                </div>
            </div>
        </div>
    );
}