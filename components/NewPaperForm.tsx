'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Loader2, Info, Clock } from 'lucide-react';
import { useTransition, useState } from 'react';
import { paperSchema, PaperFormValues, PaperFormInput } from '@/types/paper';
import { createQuestionPaper, deleteQuestionPaper, updateQuestionPaper } from "@/app/(main)/actions/paper-actions";
import { toast } from "sonner";
import { parsePaperPDF } from "@/app/(main)/actions/ocr-paper";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
//import QuestionBuilder from '@/components/QuestionBuilder';

interface NewPaperFormProps {
    examId: string;
    examSlug: string;
    initialData?: PaperFormValues & { id: string };
}

export default function NewPaperForm({ examId, examSlug, initialData }: NewPaperFormProps) {

    const [isPending, startTransition] = useTransition();
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [createdPaper, setCreatedPaper] = useState<{ id: string; title: string; year: number | null } | null>(null);
    const isEditing = !!initialData;

    const form = useForm<PaperFormInput>({
        resolver: zodResolver(paperSchema),
        defaultValues: initialData ?? {
            title: '',
            year: undefined,
        },
    });

    const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading("AI is reading the paper...");

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const result = await parsePaperPDF(base64);

            if (result.success)
            {
                const d = result.data;
                if (d.title) form.setValue("title", d.title);
                if (d.year) form.setValue("year", d.year);
                form.trigger();

                const filled = [
                    d.title && "title",
                    d.year && "year",
                ].filter(Boolean).join(", ");

                toast.success(`Imported: ${filled}`, { id: toastId });
            } else
            {
                toast.error(result.error ?? "Failed to parse PDF", { id: toastId });
            }

            setIsScanning(false);
            e.target.value = "";
        };
        reader.readAsDataURL(file);
    };

    const onSubmit = (data: PaperFormValues) => {
        startTransition(async () => {
            try
            {
                if (isEditing)
                {
                    await updateQuestionPaper(initialData!.id, { ...data, examId }, examSlug);
                    toast.success("Paper updated successfully!");
                } else
                {
                    const result = await createQuestionPaper({ ...data, examId }, examSlug);
                    setCreatedPaper({ id: result.id, title: result.title, year: result.year });
                    toast.success("Paper created! Now add your questions.");
                }
            } catch
            {
                toast.error("Failed to save paper.");
            }
        });
    };

    const handleDelete = async () => {
        if (!confirm("Delete this paper and all its questions? This cannot be undone.")) return;
        setIsDeleting(true);
        try
        {
            await deleteQuestionPaper(initialData!.id, examSlug);
            // redirect happens inside the action
        } catch
        {
            toast.error("Failed to delete paper.");
            setIsDeleting(false);
        }
    };
    // if (createdPaper)
    // {
    //     return (
    //         <QuestionBuilder
    //             paperId={createdPaper.id}
    //             examSlug={examSlug}
    //             initialQuestions={[]}
    //         />
    //     );
    // }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">

                {/* Basic Details */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Info size={14} /> Paper Details
                    </h3>

                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Paper Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. KPSC Assistant Grade II - Paper 1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold flex items-center gap-2">
                                    <Clock size={14} /> Year
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 2023"
                                        {...field}
                                        value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                        onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">
                                    Leave blank for Mock / Practice papers.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Magic Import */}
                <div className="flex items-center gap-3 pt-2 border-t">
                    <input
                        type="file"
                        id="paper-upload"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={handleMagicImport}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isScanning}
                        className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        onClick={() => document.getElementById('paper-upload')?.click()}
                    >
                        {isScanning
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <Sparkles className="w-4 h-4 mr-2" />}
                        Magic Import
                    </Button>
                    <p className="text-xs text-slate-400">Upload the paper PDF to auto-fill title & year.</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        type="submit"
                        className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                        disabled={isPending}
                    >
                        {isPending
                            ? (isEditing ? "Saving..." : "Creating...")
                            : (isEditing ? "Save Changes" : "Create Paper")
                        }
                    </Button>

                    {isEditing && (
                        <Button
                            type="button"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-14 rounded-xl"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Paper"}
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    );
}