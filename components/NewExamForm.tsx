'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Plus, BookOpen, Clock, Trophy, Tag, LayoutList, Info, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { useTransition, useState } from 'react';
import { examSchema, ExamFormValues } from '@/types/exam';
import { createExam, deleteExam, updateExam } from "@/app/(main)/actions/exam-actions";
import { toast } from "sonner";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ExamCarouselCard from './ExamCarouselCard';
import { parseSyllabusPDF } from "@/app/(main)/actions/ocr-syllabus";

interface NewExamFormProps {
    categories: { id: string; name: string; color: string | null | undefined }[];
    defaultCategoryId?: string;
    initialData?: ExamFormValues & { id: string };  // present = edit mode
}

export default function NewExamForm({ categories = [], initialData, defaultCategoryId }: NewExamFormProps) {

    const [isPending, startTransition] = useTransition();
    const [isScanning, setIsScanning] = useState(false);

    const isEditing = !!initialData;

    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examSchema),
        defaultValues: initialData ?? {
            name: '',
            description: '',
            examCategoryId: defaultCategoryId ?? '',
            categoryNumber: '',
            tags: [],
            duration: 180,
            totalMarks: 100,
            syllabus: [{ category: '', topics: [] }],
        },
    });

    // NewExamForm.tsx — only this function changes
    const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading("AI is analyzing syllabus structure...");

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const result = await parseSyllabusPDF(base64);

            if (result.success)
            {
                const d = result.data;

                // Always overwrite — user can correct manually after import
                if (d.examName) form.setValue("name", d.examName);
                if (d.categoryNumber) form.setValue("categoryNumber", d.categoryNumber);
                if (d.description) form.setValue("description", d.description);
                if (d.duration) form.setValue("duration", d.duration);
                if (d.totalMarks) form.setValue("totalMarks", d.totalMarks);
                if (d.tags?.length) form.setValue("tags", d.tags);

                // Always set syllabus
                form.setValue("syllabus", d.syllabus);

                // Trigger validation so fields show updated values
                form.trigger();

                const filled = [
                    d.examName && "name",
                    d.categoryNumber && "category #",
                    d.description && "description",
                    d.duration && "duration",
                    d.totalMarks && "marks",
                    d.tags?.length && `${d.tags.length} tags`,
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

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "syllabus",
    });

    const watchedValues = form.watch();
    const selectedCategory = categories.find(c => c.id === watchedValues.examCategoryId);

    const onSubmit = (data: ExamFormValues) => {
        startTransition(async () => {
            try
            {
                if (isEditing)
                {
                    await updateExam(initialData!.id, data);
                    toast.success("Exam updated successfully!");
                } else
                {
                    await createExam(data);
                    toast.success("Exam published successfully!");
                    form.reset();
                }
            } catch (error)
            {
                toast.error("Failed to create exam.");
            }
        });
    };

    const [isDeleting, setIsDeleting] = useState(false);
    const handleDelete = async () => {
        if (!confirm("Delete this exam? This cannot be undone.")) return;
        setIsDeleting(true);
        try
        {
            await deleteExam(initialData!.id);
        } catch
        {
            toast.error("Failed to delete exam.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
            {/* LEFT: THE FORM */}
            <div className="flex-1">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">

                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Info size={14} /> Basic Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Exam Name</FormLabel>
                                            <FormControl><Input placeholder="e.g. KPSC Assistant" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="examCategoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Parent Category</FormLabel>
                                            <select
                                                {...field}
                                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                            >
                                                <option value="">Select Category...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField control={form.control} name="categoryNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Category Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. 17, PHY, CS-01"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[10px]">
                                        Auto-filled from PDF or Google Search.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Description</FormLabel>
                                        <FormControl><Textarea {...field} placeholder="Briefly explain the exam's purpose..." className="h-24 resize-none" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-6 pt-6 border-t">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Clock size={14} /> Constraints & Meta
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="duration" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Duration (Min)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="totalMarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Total Marks</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Tags (;)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Tech; PSC; Engineering"
                                                    /* 1. Show raw string with spaces while typing */
                                                    value={Array.isArray(field.value) ? field.value.join(";") : ""}

                                                    /* 2. Simple split without trimming on every keystroke */
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        field.onChange(val.split(";"));
                                                    }}

                                                    /* 3. Clean up the spaces ONLY when they leave the field */
                                                    onBlur={() => {
                                                        const cleaned = field.value
                                                            .map((s: string) => s.trim().toLowerCase())
                                                            .filter((s: string) => s !== "");
                                                        field.onChange(cleaned);
                                                    }}

                                                />
                                            </FormControl>
                                            <FormDescription className="text-[10px]">
                                                Duplicates removed and auto-lowercased on blur.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                id="syllabus-upload"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={handleMagicImport}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isScanning}
                                className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                onClick={() => document.getElementById('syllabus-upload')?.click()}
                            >
                                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Magic Import
                            </Button>
                        </div>

                        <div className="space-y-6 pt-6 border-t">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <LayoutList size={14} /> Syllabus Structure
                                </h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ category: "", topics: [] })} className="rounded-lg font-bold border-slate-200">
                                    <Plus className="w-4 h-4 mr-1" /> Add Section
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="relative pt-2"> {/* Wrapper to handle the icon "pop-out" */}

                                    {/* The Trash Tab Header */}
                                    <div className="absolute top-0 right-0 flex justify-end">
                                        <div className="bg-white border border-slate-200 border-b-0 rounded-t-xl px-2 py-1 flex items-center shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* The Main Content Card */}
                                    <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-sm rounded-xl rounded-tr-none">
                                        <FormField
                                            control={form.control}
                                            name={`syllabus.${index}.category`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Section Title (e.g. Aptitude)"
                                                            {...field}
                                                            className="font-bold text-slate-700 bg-white border-slate-200 h-11 focus-visible:ring-slate-900"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`syllabus.${index}.topics`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Topic 1; Topic 2..."
                                                            /* 1. Keep the raw string while typing */
                                                            value={Array.isArray(field.value) ? field.value.join(";") : ""}

                                                            /* 2. Simple split without trimming on every keystroke */
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                field.onChange(val.split(";"));
                                                            }}

                                                            /* 3. Clean up the spaces ONLY when they leave the field */
                                                            onBlur={() => {
                                                                const cleaned = field.value
                                                                    .map((s: string) => s.trim())
                                                                    .filter((s: string) => s !== "");
                                                                field.onChange(cleaned);
                                                            }}

                                                            className="bg-white resize-none text-sm border-slate-200 min-h-[100px] focus-visible:ring-slate-900"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </Card>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">

                            <Button
                                type="submit"
                                className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                                disabled={isPending}
                            >
                                {isPending
                                    ? (isEditing ? "Saving..." : "Publishing...")
                                    : (isEditing ? "Save Changes" : "Publish Exam Content")
                                }
                            </Button>
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 text-red-600 hover:text-red-700 h-14 rounded-xl"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Deleting..." : "Delete Exam"}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div className="w-full lg:w-[400px] lg:sticky lg:top-8 space-y-6">
                <p className="text-[13px] font-black text-slate-500 uppercase tracking-[0.3em]">Exam Preview</p>

                <ExamCarouselCard
                    name={watchedValues.name}
                    description={watchedValues.description}
                    isPreview={true}
                    tags={watchedValues.tags}
                    categoryName={selectedCategory?.name}
                    accentColor={selectedCategory?.color}
                    totalMarks={watchedValues.totalMarks}
                    duration={watchedValues.duration}
                    syllabus={watchedValues.syllabus}
                />

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-800 leading-relaxed italic">
                        The preview shows how the student will see the exam card. Ensure your Syllabus Section titles are clear.
                    </p>
                </div>
            </div>
        </div>
    );
}