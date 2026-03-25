'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Plus, BookOpen, Clock, Trophy, Tag, LayoutList, Info, ChevronRight } from 'lucide-react';
import { useTransition } from 'react';
import { examSchema, ExamFormValues } from '@/types/exam';
import { createExam } from "@/app/actions/exam-actions";
import { toast } from "sonner";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ExamCarouselCard from './ExamCarouselCard';



export default function NewExamForm({ categories = [] }: { categories: { id: string, name: string, color: string | null | undefined }[] }) {
    const [isPending, startTransition] = useTransition();

    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            name: '',
            description: '',
            examCategoryId: '',
            tags: [],
            duration: 180,
            totalMarks: 100,
            syllabus: [{ category: '', topics: [] }],
        },
    });

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
                await createExam(data);
                toast.success("Exam published successfully!");
                form.reset();
            } catch (error)
            {
                toast.error("Failed to create exam.");
            }
        });
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

                        <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all" disabled={isPending}>
                            {isPending ? "Publishing..." : "Publish Exam Content"}
                        </Button>
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