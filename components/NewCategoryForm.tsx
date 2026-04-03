"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, ImageIcon, LayoutGrid, Type, Palette } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { Button } from '@/components/ui/button';
import { createCategory, updateCategory, deleteCategory } from "@/app/(main)/actions/category-actions";
import { useTransition, useState } from "react";
import ExamCategoryCard from "./ExamCategoryCard";
import {
    Form, FormControl, FormDescription, FormField,
    FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { categorySchema, CategoryFormValues } from "@/types/category";

interface NewCategoryFormProps {
    initialData?: CategoryFormValues & { id: string };
}

export default function NewCategoryForm({ initialData }: NewCategoryFormProps) {
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const isEditing = !!initialData;

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: initialData ?? {
            name: "",
            description: "",
            icon: "Briefcase",
            color: "#1D3557",
            image: "",
        },
        mode: "onBlur",
    });

    const watchedValues = form.watch();

    const handleDelete = async () => {
        if (!confirm(`Delete "${initialData?.name}"? This cannot be undone.`)) return;
        setIsDeleting(true);
        try
        {
            await deleteCategory(initialData!.id);
        } catch
        {
            toast.error("Failed to delete category.");
            setIsDeleting(false);
        }
    };

    async function onSubmit(data: CategoryFormValues) {
        startTransition(async () => {
            try
            {
                if (isEditing)
                {
                    await updateCategory(initialData!.id, data);
                    toast.success("Category updated successfully!");
                } else
                {
                    await createCategory(data);
                    toast.success("Category created successfully!");
                    form.reset();
                }
            } catch
            {
                toast.error("Something went wrong. Please try again.");
            }
        });
    }

    return (
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
            <div className="flex-1">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold flex items-center gap-2">
                                        <Type size={16} /> Category Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Degree Level" {...field} />
                                    </FormControl>
                                    <FormDescription>The main title for this category.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe which exams fall under this category..."
                                            className="resize-none h-24"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="icon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold flex items-center gap-2">
                                            <LayoutGrid size={16} /> Icon Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. GraduationCap, Briefcase" {...field} />
                                        </FormControl>
                                        <FormDescription>Lucide icon name to display.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold flex items-center gap-2">
                                            <Palette size={16} /> Accent Color
                                        </FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                                            </FormControl>
                                            <Input value={field.value} onChange={field.onChange} className="font-mono text-sm" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="font-bold">Category Banner</FormLabel>
                                        {field.value && field.value !== "adnan-saifee-zmr9TeA7WjU-unsplash_jpxf7l.jpg" && (
                                            <button
                                                type="button"
                                                onClick={() => form.setValue("image", "")}
                                                className="text-xs text-red-500 hover:underline font-medium"
                                            >
                                                Reset to Default
                                            </button>
                                        )}
                                    </div>
                                    <FormControl>
                                        <CldUploadWidget
                                            uploadPreset="kpsc_preset"
                                            onSuccess={(result: any) => {
                                                form.setValue("image", result?.info?.public_id, {
                                                    shouldValidate: true,
                                                });
                                            }}
                                        >
                                            {({ open }) => (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full h-32 border-dashed border-2 flex-col gap-2 hover:bg-slate-50 transition-all"
                                                    onClick={() => open()}
                                                >
                                                    {field.value && field.value !== "adnan-saifee-zmr9TeA7WjU-unsplash_jpxf7l.jpg" ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-emerald-600 font-bold flex items-center gap-2">
                                                                <CheckCircle2 size={18} /> Custom Image Linked
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                                                                {field.value}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <ImageIcon className="text-slate-400" />
                                                            <div className="text-center">
                                                                <p className="text-sm font-medium">Upload Banner Image</p>
                                                                <p className="text-xs text-slate-400 mt-1">Leave empty to use default banner</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </CldUploadWidget>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-12 text-lg font-bold transition-all"
                                disabled={isPending}
                            >
                                {isPending
                                    ? (isEditing ? "Saving..." : "Creating Category...")
                                    : (isEditing ? "Save Changes" : "Create Exam Category")
                                }
                            </Button>

                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-13 rounded-xl px-6"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>

            {/* Preview */}
            <div className="w-full lg:w-[380px] lg:sticky lg:top-8">
                <p className="text-[13px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">
                    Card Preview
                </p>
                <div className="pointer-events-none opacity-90 scale-95 origin-top">
                    <ExamCategoryCard
                        id="preview-id"
                        name={watchedValues.name || "Category Title"}
                        description={watchedValues.description || "The description will appear here as you type..."}
                        icon={watchedValues.icon || "Briefcase"}
                        color={watchedValues.color || "#1D3557"}
                        image={watchedValues.image || ""}
                        slug="preview-slug"
                    />
                </div>
                <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-700 leading-relaxed">
                        <strong>Pro Tip:</strong> Ensure your banner image has enough contrast for the white text to be readable.
                    </p>
                </div>
            </div>
        </div>
    );
}